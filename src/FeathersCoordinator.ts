import _ from "lodash";
import feathersAuthClient from "@feathersjs/authentication-client";
import { StorageWrapper } from "@feathersjs/authentication-client/lib/storage";
import jsrsasign from "jsrsasign";

import { Conflict } from "@feathersjs/errors";
import feathers, { Application, ServiceAddons, ServiceMethods, ServiceOverloads } from "@feathersjs/feathers";
import socketio from "@feathersjs/socketio-client";
import fetch from 'isomorphic-fetch';
import io from "socket.io-client";
import AbstractCoordinator from "./AbstractCoordinator";
import Client from "./Client";
import Credentials from "./Credentials";
import Resource from "./Resource";
import Proxemics from "./Proxemics";
import Instance from "./Instance";
import ClientNameNotUnique from "./errors/ClientNameNotUnique";
import DeviceNotFoundError from "./errors/DeviceNotFoundError";
import DeviceUuidIsNotUnique from "./errors/DeviceUuidIsNotUnique";
import InvalidBrokerJwtError from "./errors/InvalidBrokerJwtError";

export default class FeathersCoordinator extends AbstractCoordinator {
    private static GENERIC_EVENT_CALLBACK: (evenType: string) => (event: any) => void
        = (evenType: string) => (event: any) => console.log(evenType + ":", event);
    private static LOCAL_STORAGE_JWT_ACCESS_TOKEN_KEY: string = 'feathers-jwt';

    public user: any;
    public client: Client;
    public device: any;
    public resource: Resource;
    public proxemics: Proxemics;
    public instance: Instance;
    public instances: Array<any>;
    public activeInstances: Array<any>;

    private localDeviceUrl: string;
    private credentials: Credentials;
    private socket: SocketIOClient.Socket;
    private feathersClient: Application<object>;

    private devicesService: ServiceOverloads<any> & ServiceAddons<any> & ServiceMethods<any>;
    private instancesService: ServiceOverloads<any> & ServiceAddons<any> & ServiceMethods<any>;
    private resourcesService: ServiceOverloads<any> & ServiceAddons<any> & ServiceMethods<any>;
    private proxemicsService: ServiceOverloads<any> & ServiceAddons<any> & ServiceMethods<any>;
    private eventsService: ServiceOverloads<any> & ServiceAddons<any> & ServiceMethods<any>;

    private brokerPublicKey: string;
    private storage: Storage;

    private subscribeReconnectsFunction: (state: any, proxemics: any) => void;

    constructor(brokerUrl: string,
        localDeviceUrl: string,
        clientId: string = 'default',
        credentials: Credentials = null,
        brokerPublicKey: string = null,
        onAuthenticated: (event: any) => void = FeathersCoordinator.GENERIC_EVENT_CALLBACK('authenticated'),
        onLogout: (event: any) => void = FeathersCoordinator.GENERIC_EVENT_CALLBACK('logout'),
        onReAuthenticationError: (event: any) => void = FeathersCoordinator.GENERIC_EVENT_CALLBACK('reauthentication-error'),
        localStorageLocation: string = "./data/localstorage") {
        super();

        this.client = new Client(clientId);
        this.credentials = credentials;
        this.resource = new Resource();
        this.proxemics = new Proxemics();
        this.instance = new Instance();
        this.instances = new Array<any>();
        this.activeInstances = new Array<any>();

        this.socket = io(brokerUrl, {
            transports: ['websocket'],
            forceNew: true
        });
        this.localDeviceUrl = localDeviceUrl;
        this.feathersClient = feathers();
        this.feathersClient.configure(socketio(this.socket, { timeout: 5000 }));

        this.brokerPublicKey = brokerPublicKey;

        this.devicesService = this.feathersClient.service('devices');
        this.instancesService = this.feathersClient.service('instances');
        this.resourcesService = this.feathersClient.service('resources');
        this.proxemicsService = this.feathersClient.service('proxemics');
        this.eventsService = this.feathersClient.service('events');

        if ((typeof window === "undefined" || window === null) ||
            (typeof window.localStorage === "undefined" || window.localStorage === null)) {
            let NodeLocalStorage = require('node-localstorage').LocalStorage
            this.storage = new NodeLocalStorage(localStorageLocation);
        } else {
            this.storage = window.localStorage;
        }

        if (!this.credentials && this.storage.getItem(FeathersCoordinator.LOCAL_STORAGE_JWT_ACCESS_TOKEN_KEY)) {
            this.credentials = new Credentials('jwt', [this.storage.getItem(FeathersCoordinator.LOCAL_STORAGE_JWT_ACCESS_TOKEN_KEY)]);
        }

        this.feathersClient.configure(feathersAuthClient({ storage: new StorageWrapper(this.storage) }));
        this.feathersClient.on('authenticated', onAuthenticated ? onAuthenticated : FeathersCoordinator.GENERIC_EVENT_CALLBACK('authenticated'));
        this.feathersClient.on('logout', onLogout ? onLogout : FeathersCoordinator.GENERIC_EVENT_CALLBACK('logout'));
        this.feathersClient.on('reauthentication-error', onReAuthenticationError ? onReAuthenticationError : FeathersCoordinator.GENERIC_EVENT_CALLBACK('reauthentication-error'));

        //Re-initialize on reconnect
        const feathersSocketClient: SocketIOClient.Socket = this.feathersClient as any;
        feathersSocketClient.io.on('reconnect', (attempt: number) => {
            this.init().then(resource => {
                console.log(`Reconnected after ${attempt} attempts`);
                this.subscribeReconnectsFunction(resource[0], resource[1]);
            }).catch(e => console.error(e));
        });
        /* TODO:
         * Perhaps I should deal with ALL/MOST of the Socket.io events!
         * https://socket.io/docs/client-api/#Event-%E2%80%98connect-error%E2%80%99
         */
        feathersSocketClient.io.on('connect_error', (error: any) => {
            console.error('Connection Error:', error);
        })
        if (typeof document !== 'undefined') {
            document.addEventListener("visibilitychange", () => this.setInstanceActiveness(!document.hidden));
        }
    }

    public init(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.feathersClient.authentication.getAccessToken().then(jwt => {
                if (jwt) {
                    const jwtHeader: any = jsrsasign.KJUR.jws.JWS.readSafeJSONString(jsrsasign.b64utoutf8(jwt.split(".")[0]));
                    if (jwtHeader) {
                        this.credentials = new Credentials('jwt', [jwt]);
                    }
                }
                const auth: any = {};
                switch (this.credentials.type) {
                    case 'yanux':
                        auth['strategy'] = 'yanux';
                        auth['accessToken'] = this.credentials.values[0];
                        auth['clientId'] = this.credentials.values[1];
                        break;
                    case 'local':
                        auth['strategy'] = 'local';
                        auth['email'] = this.credentials.values[0];
                        auth['password'] = this.credentials.values[1];
                        break;
                    case 'jwt':
                        auth['strategy'] = 'jwt';
                        auth['accessToken'] = this.credentials.values[0];
                        break;
                }
                return auth;
            }).then(auth => {
                return this.feathersClient.authenticate(auth);
            }).then(response => {
                if (this.brokerPublicKey) {
                    const header: any = jsrsasign.KJUR.jws.JWS.readSafeJSONString(jsrsasign.b64utoutf8(response.accessToken.split(".")[0]));
                    const isJwtValid = jsrsasign.KJUR.jws.JWS.verifyJWT(response.accessToken, this.brokerPublicKey, { alg: [header.alg] } as { alg: string[]; aud: string[]; iss: string[]; sub: string[] });
                    if (!isJwtValid) {
                        throw new InvalidBrokerJwtError('The JWT is not valid.');
                    }
                }
                return Promise.all([
                    this.feathersClient.service('users').get(response.user ? response.user._id : response.authentication.payload.user._id),
                    this.feathersClient.service('clients').get(response.client ? response.client._id : response.authentication.payload.client._id)
                ]);
            }).then(results => {
                this.user = results[0];
                if (results[1]) {
                    return this.feathersClient.service('clients').get(results[1]);
                } else {
                    return this.feathersClient.service('clients').find({ query: { id: this.client.id } });
                }
            }).then(results => {
                const clients = (results as any).data ? (results as any).data : results;
                if (Array.isArray(clients)) {
                    if (clients.length === 1) {
                        return clients[0];
                    } else if (clients.length === 0) {
                        return this.feathersClient.service('clients').create({ id: this.client.id });
                    } else {
                        reject(new ClientNameNotUnique('The impossible has happened! There is more than a single client with the same UNIQUE name.'));
                    }
                } else { return clients; }
            }).then(client => {
                this.client.raw = client;
                return fetch(`${this.localDeviceUrl}/deviceInfo`);
            }).then(response => {
                return response.json();
            }).then(deviceInfo => {
                return this.devicesService.find({
                    query: {
                        $limit: 1,
                        user: this.user._id,
                        deviceUuid: deviceInfo.deviceUuid
                    }
                });
            }).then(results => {
                const devices = (results as any).data ? (results as any).data : results;
                if (devices.length === 1) {
                    this.device = devices[0];
                    return this.instancesService.create({
                        user: this.user._id,
                        client: this.client.raw._id,
                        device: devices[0]._id
                    });
                } else if (devices.length > 1) {
                    reject(new DeviceUuidIsNotUnique('The impossible has happened! There is more than a device client with the same UUID.'));
                } else {
                    reject(new DeviceNotFoundError('A device with the given UUID could\'nt be found!'));
                }
            }).then(instance => {
                this.instance.update(instance);
                console.log('Instance:', instance);
                return this.updateInstanceActiveness()
            }).then(updatedInstance => {
                console.log('Updated Instance Activeness:', updatedInstance);
                return Promise.all([this.getResourceData(), this.getProxemicsState()]);
            }).then(results => resolve(results)).catch(err => {
                if (!(err instanceof Conflict)) { reject(err); }
            })
        });
    }

    public logout() { this.feathersClient.logout(); }

    public isConnected(): boolean { return this.socket.connected; }

    private getResource(): Promise<Resource> {
        return new Promise((resolve, reject) => {
            this.resourcesService.find({
                query: {
                    $limit: 1,
                    user: this.user._id,
                    client: this.client.raw._id
                }
            }).then(resources => {
                if ((<Array<any>>resources).length === 1) {
                    this.resource.update((<any>resources)[0])
                    return resolve(this.resource);
                } else {
                    this.resourcesService.create({
                        user: this.user._id,
                        client: this.client.raw._id
                    }).then(resource => {
                        this.resource.update(resource)
                        return resolve(this.resource);
                    }).catch(err => {
                        if (!(err instanceof Conflict)) {
                            reject(err);
                        }
                    })
                }
            }).catch(err => reject(err));
        });
    }

    public getResourceData(): Promise<any> {
        return this.getResource().then(resource => resource.data).catch(err => Promise.reject(err));
    }

    public setResourceData(data: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.resourcesService.patch(this.resource.id, { data: data })
                .then(resource => {
                    this.resource.update(resource);
                    resolve(resource.data)
                }).catch(err => reject(err));
        });
    }

    private getProxemics(): Promise<Proxemics> {
        return new Promise((resolve, reject) => {
            this.proxemicsService.find({
                query: {
                    $limit: 1,
                    user: this.user._id
                }
            }).then(proxemics => {
                if ((<Array<any>>proxemics).length === 1) {
                    this.proxemics.update((<any>proxemics)[0])
                    return resolve(this.proxemics);
                } else {
                    this.proxemicsService.create({
                        user: this.user._id,
                    }).then(proxemics => {
                        this.proxemics.update(proxemics)
                        return resolve(this.proxemics);
                    }).catch(err => {
                        if (!(err instanceof Conflict)) {
                            reject(err);
                            //reject(new ProxemicsNotFoundError('Could not find proxemics associated with the current user.'))
                        }
                    })
                }
            }).catch(err => reject(err));
        });
    }

    public getProxemicsState(): Promise<any> {
        return this.getProxemics().then(proxemics => proxemics.state).catch(err => Promise.reject(err));
    }

    public getInstances(extraConditions: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const query: any = {
                $populate: 'device',
                user: this.user._id,
                client: this.client.raw._id
            };
            Object.assign(query, extraConditions);
            this.instancesService.find({
                query
            }).then(instances => {
                if (!extraConditions) {
                    this.instances = instances;
                }
                return resolve(instances);
            }).catch(err => reject(err));
        });
    }

    public getActiveInstances(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getInstances({
                active: true
            }).then(activeInstances => {
                this.activeInstances = activeInstances;
                return resolve(this.activeInstances)
            }).catch(err => reject(err));
        });
    }

    public updateInstanceActiveness(): Promise<any> {
        if (typeof document !== 'undefined') {
            return this.setInstanceActiveness(!document.hidden);
        } else {
            return Promise.resolve();
        }
    }

    public setInstanceActiveness(active: Boolean): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.instancesService.patch(this.instance.id, { active: active })
                .then(instance => {
                    this.instance.update(instance);
                    resolve(instance)
                }).catch(err => reject(err));
        });
    }

    public emitEvent(value: any, name: string): Promise<any> {
        return this.eventsService.create({ value, name });
    }

    public subscribeResource(subscriberFunction: (data: any, eventType: string) => void): void {
        let eventListener = (resource: any, eventType: string = 'updated') => {
            /**
             * TODO: This should be enforced at the Broker level.
             * I should also enforce that the Client ID of the token that is
             * used for authentication matches the provided clientId.
             * However, I have yet to find a straightforward way of doing so.
             * I will surely have to make some server-side ajustments that may
             * force me to change the way things are handled on the client-side
             * in order to provide extra security.
             */
            if (this.resource.id === resource._id &&
                this.client.raw._id === resource.client &&
                this.user._id === resource.user) {
                this.resource.update(resource);
                subscriberFunction(this.resource.data, eventType);
            } else {
                console.error('I\'m getting events that I shouldn\'t have heard about.');
            }
        };
        this.resourcesService.removeAllListeners('updated');
        this.resourcesService.removeAllListeners('patched');
        this.resourcesService.on('updated', resource => eventListener(resource, 'updated'));
        this.resourcesService.on('patched', resource => eventListener(resource, 'patched'));
    }

    public subscribeProxemics(subscriberFunction: (data: any, eventType: string) => void): void {
        let eventListener = (proxemics: any, eventType: string = 'updated') => {
            /**
             * TODO: This should be enforced at the Broker level.
             * [Read the similar comment on the "subscribeResource" method for an explanation.]
             */
            if (this.proxemics.id === proxemics._id &&
                this.user._id === proxemics.user) {
                if (!_.isEqual(proxemics.state, this.proxemics.state)) {
                    this.proxemics.update(proxemics);
                    subscriberFunction(proxemics.state, eventType);
                }
            } else {
                console.error('I\'m getting events that I shouldn\'t have heard about.');
            }
        };
        this.proxemicsService.removeAllListeners('updated');
        this.proxemicsService.removeAllListeners('patched');
        this.proxemicsService.on('updated', proxemics => eventListener(proxemics, 'updated'));
        this.proxemicsService.on('patched', proxemics => eventListener(proxemics, 'patched'));
    }

    public subscribeInstances(subscriberFunction: (data: any, eventType: string) => void): void {
        let eventListener = (instance: any, eventType: string = 'updated') => {
            /**
             * TODO: This should be enforced at the Broker level.
             * [Read the similar comment on the "subscribeResource" method for an explanation.]
             */
            if (this.user._id === instance.user && this.client.raw._id === instance.client) {
                if (this.instance.id === instance._id) {
                    this.instance.update(instance);
                }
                subscriberFunction(instance, eventType);
            } else {
                console.error('I\'m getting events that I shouldn\'t have heard about.');
            }
        };
        this.instancesService.removeAllListeners('updated');
        this.instancesService.removeAllListeners('patched');
        this.instancesService.on('updated', instance => eventListener(instance, 'updated'));
        this.instancesService.on('patched', instance => eventListener(instance, 'patched'));
    }

    public subscribeEvents(subscriberFunction: (data: any, eventType: string) => void): void {
        let eventListener = (event: any, eventType: string = 'created') => {
            subscriberFunction(event, eventType);
        };
        this.eventsService.removeAllListeners('created');
        this.eventsService.on('created', event => eventListener(event, 'created'));
    }

    public subscribeReconnects(subscriberFunction: (state: any, proxemics: any) => void): void {
        this.subscribeReconnectsFunction = subscriberFunction;
    }
}
