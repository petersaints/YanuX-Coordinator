import {
    Credentials,
    FeathersCoordinator,
    ComponentsRuleEngine
} from "./index";
/**
 * TODO: Create tests using a true testing library. 
 */
function testFeathersCoordinator(): void {
    console.log('Testing FeathersCoordinator');
    const brokerUrl: string = "http://localhost:3002";
    const localDeviceUrl: string = "http://localhost:3003";
    const clientId = "yanux-ips-desktop-client";
    const credentials: Credentials = new Credentials("yanux", [
        "tZ0RxsvLgAe6KGhMAZIV8wP0VZRJSKzY9OFBcErLSHlIUdIuNyMFvqIZDuCKQXidqgTYc7GZMMSHX8HZBnF6a6sLMDtNdnfGyDGErrKX0w9u0i2Qc0xtYzfVLzBKezlpoxUqKaaY1hQWrdfcDyiq96sd0qyP9uRZlNyKtx8jMSWuAOcZKbi9cZYLjdeBcS7gyvS0NSRC56HodQYTQglc2yWLNqjHPDs6or2tjrNCRjb7ofyBZeVVgk031mPyr7uI",
        clientId
    ]);
    //const credentials: Credentials = new Credentials("local", ["test_user_0@yanux.org", "topsecret"]);
    const coordinator: FeathersCoordinator = new FeathersCoordinator(brokerUrl, localDeviceUrl, clientId, credentials);
    coordinator.init().then(result => {
        console.log('State:', result);
        return coordinator.setResourceData({ message: "in a bottle" });
    }).then(data => console.log('Data:', data)).catch(error => console.error('Error:', error));
    coordinator.subscribeResource(data => console.log('Data Changed:', data));
}

function testComponentsRuleEngine(): void {
    console.log('Testing ComponentsRuleEngine');
    class ObjectId {
        public id: string;
        constructor(id: string) {
            this.id = id;
        }
        toString() {
            return this.id;
        }
    }
    const localDeviceUuid = "3d42affa-3685-47f2-97d0-bd4ff46de5c6";
    const instances = [
        {
            "_id": new ObjectId("5cb4c511eb479c2e46a7a20d"),
            "active": false,
            "brokerName": "YanuX-Broker",
            "user": new ObjectId("5cb4c3b2eb479c2e46a785d7"),
            "client": new ObjectId("5cb4c50feb479c2e46a7a1e2"),
            "device": {
                "_id": new ObjectId("5cb4c420eb479c2e46a78969"),
                "beaconValues": [
                    "113069EC-6E64-4BD3-6810-DE01B36E8A3E",
                    1,
                    101
                ],
                "brokerName": "YanuX-Broker",
                "deviceUuid": "3d42affa-3685-47f2-97d0-bd4ff46de5c6",
                "user": new ObjectId("5cb4c3b2eb479c2e46a785d7"),
                "createdAt": new Date("2019-04-15T17:49:20.145Z"),
                "updatedAt": new Date("2019-04-15T18:01:02.481Z"),
                "__v": 0
            },
            "instanceUuid": "0ea41404-86a7-42d7-980c-f343ef66df10",
            "createdAt": new Date("2019-04-15T17:53:21.038Z"),
            "updatedAt": new Date("2019-04-15T17:54:32.525Z"),
            "__v": 0
        },
        {
            "_id": new ObjectId("5cb4c532eb479c2e46a7a43b"),
            "active": true,
            "brokerName": "YanuX-Broker",
            "user": new ObjectId("5cb4c3b2eb479c2e46a785d7"),
            "client": new ObjectId("5cb4c50feb479c2e46a7a1e2"),
            "device": {
                "_id": new ObjectId("5cb4c3b2eb479c2e46a785d8"),
                "beaconValues": [
                    "113069EC-6E64-4BD3-6810-DE01B36E8A3E",
                    1,
                    100
                ],
                "brokerName": "YanuX-Broker",
                "deviceUuid": "9ab8e750-bc1e-11e8-a769-3f2e91eebf08",
                "user": new ObjectId("5cb4c3b2eb479c2e46a785d7"),
                "createdAt": new Date("2019-04-15T17:47:30.957Z"),
                "updatedAt": new Date("2019-04-15T17:47:30.957Z"),
                "__v": 0
            },
            "instanceUuid": "9057a01c-9854-486d-9a11-cc4af4d7d5b8",
            "createdAt": new Date("2019-04-15T17:53:54.870Z"),
            "updatedAt": new Date("2019-04-15T17:53:54.880Z"),
            "__v": 0
        }
    ];
    const proxemics = {
        "_id": new ObjectId("5cb4c3d0eb479c2e46a785dc"),
        "brokerName": "YanuX-Broker",
        "user": "5cb4c3b2eb479c2e46a785d7",
        "state": {
            "3d42affa-3685-47f2-97d0-bd4ff46de5c6": {
                "view": true,
                "control": true,
                "display": {
                    "resolution": [1920, 1080],
                    "pixelDensity": 96,
                    "bitDepth": 24,
                    "size": [481, 271],
                    "refreshRate": 60
                },
                "speakers": {
                    "type": "loudspeaker",
                    "channels": 2,
                },
                "camera": {
                    "resolution": [1280, 720],
                },
                "microphone": {
                    "channels": 1,
                },
                "input": ["keyboard", "mouse"],
                "sensors": [] as any[]
            },
            "9ab8e750-bc1e-11e8-a769-3f2e91eebf08": {
                /*"display": {
                    "resolution": [2248, 1080],
                    "pixelDensity": 402,
                    "size": [154.9, 74.8],
                    "refreshRate": 60
                },
                "speakers": {
                    "type": "loudspeaker",
                    "channels": 1,
                },
                "camera": {
                    "resolution": [4032, 3024],
                },
                "input": ["keyboard", "mouse"],
                "sensors": []*/
                "display": {
                    "resolution": [1920, 1080],
                    "pixelDensity": 96,
                    "bitDepth": 24,
                    "size": [481, 271],
                    "refreshRate": 60
                },
                "speakers": {
                    "type": "loudspeaker",
                    "channels": 1,
                },
                "camera": {
                    "resolution": [1280, 720],
                },
                "microphone": {
                    "channels": 1,
                },
                "input": ["keyboard", "mouse"],
                "sensors": [] as any[]
            }
        },
        "updatedAt": new Date("2019-04-15T17:56:57.834Z"),
        "createdAt": new Date("2019-04-15T17:56:57.834Z")
    };
    const restrictions = {
        "viewer-form": {
            "display": true,
            "input": {
                "operator": "OR",
                "values": [{
                    "operator": "AND",
                    "values": ["keyboard", "mouse"]
                }, "touchscreen"]
            }
        },
        "player": {
            "display": {
                "operator": "AND",
                "values": {
                    "resolution": {
                        "operator": ">=",
                        "value": [1280, null],
                    },
                    "size": {
                        "operator": ">=",
                        "value": [160, 90],
                    },
                    "pixelDensity": {
                        "operator": "NOT",
                        "values": {
                            "operator": ">",
                            "value": 150
                        }
                    },
                }
            },
            "speakers": {
                "channels": [
                    {
                        "operator": ">=",
                        "value": 2,
                        "enforce": false
                    },
                    {
                        "operator": ">=",
                        "value": 1,
                    }
                ]
            }
        }
    };
    const componentsRuleEngine = new ComponentsRuleEngine(localDeviceUuid, instances, proxemics.state, restrictions);
    componentsRuleEngine.run().then(data => {
        console.log(data.componentsConfig);
        //console.log(data.capabilities);
    });
}

function test(): void {
    console.log('Running tests')
    //testFeathersCoordinator();
    testComponentsRuleEngine();
}
test();