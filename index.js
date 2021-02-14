const express = require("express");
const { WebhookClient } = require("dialogflow-fulfillment");
const { Payload } = require("dialogflow-fulfillment");
const MongoClient = require("mongodb").MongoClient;

const app = express();
var URL = "mongodb://localhost:27017/";
var randomstring = require("randomstring");
var user_name = "";

app.post("/dialogflow", express.json(), (req, res) => {
    const agent = new WebhookClient({
        request: req, response: res
    });

    async function identify_user(agent)
    {
        const acct_num = agent.parameters.acct_num;
        const client = new MongoClient(URL);
        await client.connect();
        const snap = await client.db("chatbot").collection("user_table").findOne({accountNumber: acct_num});

        if(snap == null) {
            await agent.add("Re-Enter your account number");
        } else {
            user_name = snap.name;
            await agent.add("Welcome, " + user_name + "! How can I help you");
        }
    }

    function report_issue(agent)
    {
        var issue_vals = {
            1: "Internet Down",
            2: "Slow Internet",
            3: "Buffering Problem",
            4: "No connectivity"
        };

        const intent_val = agent.parameters.issue_num;
        var val = issue_vals[intent_val];
        var trouble_ticket = randomstring.generate(8);

        MongoClient.connect(URL, function(err, db) {
            if(err) throw err
            var database = db.db("chatbot");

            var user = user_name;
            var issue_val = val;
            var status = "pending";
            let timestamp = Date.now();
            let date_object = new Date(timestamp);
            let date = date_object.getDate();
            let month = date_object.getMonth() + 1;
            let year = date_object.getFullYear();

            var full_date = year + "-" + month + "-" + date;
            
            var my_object = {
                username: user,
                issue: issue_val,
                status: status,
                full_date: full_date,
                trouble_ticket: trouble_ticket
            };

            database.collection("user_issues").insertOne(my_object, function(err, res) {
                if(err) throw err;
                db.close();
            });
        });

        agent.add("Issue reported: " + val + "\nThe ticket number is: " + trouble_ticket);
    }

    function custom_payload(agent)
    {
        var payLoadData = {
            "richContent": [
                [
                    {
                        "type": "list",
                        "title": "Internet Down",
                        "subtitle": "Press '1' for No internet issue",
                        "event": {
                            "name": "",
                            "languageCode": "",
                            "parameters": {}
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "list",
                        "title": "Slow Internet",
                        "subtitle": "Press '2' for slow internet issue",
                        "event": {
                            "name": "",
                            "languageCode": "",
                            "parameters": {}
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "list",
                        "title": "Buffering Issue",
                        "subtitle": "Press '3' for Buffering issue",
                        "event": {
                            "name": "",
                            "languageCode": "",
                            "parameters": {}
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "list",
                        "title": "No connectivity",
                        "subtitle": "Press '4' for No Connectivity issue",
                        "event": {
                            "name": "",
                            "languageCode": "",
                            "parameters": {}
                        }
                    }
                ]
            ]
        }
        agent.add(new Payload(agent.UNSPECIFIED, payLoadData, {sendAsMessage:true, rawPayload: true}));
    }

    var intentMap = new Map();
    intentMap.set("service_intent", identify_user);
    intentMap.set("service_intent-custom", custom_payload);
    intentMap.set("service_intent-custom-followup", report_issue);
    agent.handleRequest(intentMap);
});


app.listen(process.env.PORT || 8080);