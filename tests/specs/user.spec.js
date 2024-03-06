let expect;
let server;

before("Run Server", async function () {
    const chai = await import("chai");
    expect = chai.expect;
    // Adjust the relative path as necessary and include the file extension
    server = (await import("../../server.js")).getApp;
});


describe("Healthcheck is working", function() {

    const url = "http://localhost:3001/api/user/healthcheck";

    describe("GET /healthcheck", function() {

        it("returns status 200", function(done) {
            fetch(url)
                .then(response => {
                    expect(response.status).to.equal(200);
                    done();
                })
                .catch(err => done(err));
        });

        it("JSON body is correct", function(done) {
            fetch(url)
                .then(response => response.json()) // Convert to JSON
                .then(data => {
                    expect(data.message).to.equal("User Service is running");
                    done();
                })
                .catch(err => done(err));
        });

    });

});
