import {
    Credentials,
    FeathersCoordinator
} from "./index";

/** TODO: Create "proper" tests. */
function test(): void {
    const url: string = "http://localhost:3002";
    const clientName: string = "demo";
    const credentials: Credentials = new Credentials("yanux", [
        "tZ0RxsvLgAe6KGhMAZIV8wP0VZRJSKzY9OFBcErLSHlIUdIuNyMFvqIZDuCKQXidqgTYc7GZMMSHX8HZBnF6a6sLMDtNdnfGyDGErrKX0w9u0i2Qc0xtYzfVLzBKezlpoxUqKaaY1hQWrdfcDyiq96sd0qyP9uRZlNyKtx8jMSWuAOcZKbi9cZYLjdeBcS7gyvS0NSRC56HodQYTQglc2yWLNqjHPDs6or2tjrNCRjb7ofyBZeVVgk031mPyr7uI",
        "yanux-ips-desktop-client"
    ]);
    /*
    const credentials: Credentials = new Credentials("local", [
        "test_user_0@yanux.org",
        "topsecret"
    ]);
    */
    const coordinator: FeathersCoordinator = new FeathersCoordinator(url, clientName, credentials);
    coordinator.init()
        .then(result => {
            console.log('State:', result);
            return coordinator.setData({ myfavoritenumber: [8, 19, 88, 1988] });
        })
        .then(data => console.log('Data: ', data))
        .catch(error => console.log('Error:', error));
    coordinator.subscribe(data => console.log('Data Changed: ', data));
}

test();