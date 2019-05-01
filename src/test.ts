import {
    Credentials,
    FeathersCoordinator
} from "./index";
/**
 * TODO: Create tests using a true testing library. 
 */
function test(): void {
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
test();