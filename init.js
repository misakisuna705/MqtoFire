#!/usr/bin/env node

const path = require("path");
const program = require("commander");
const MQTT = require("mqtt");
const FIREBASE_ADMIN = require("firebase-admin");

program
  .option("--host <url>", "MQTT broker url")
  .option("--username <username>", "MQTT broker username")
  .option("--password <password>", "MQTT broker password")
  .option("--firebase <path>", "Firebase Admin SDK")
  .option("--topics <list>", "list of comma seperated topics")
  .action(cmd => {
    const { host, username, password, firebase, topics } = cmd;

    if (!(host && username && password && firebase && topics)) {
      console.error("flag undefined");
      process.exit(1);
    }

    const CERTIFICATE = require(path.resolve(process.cwd(), firebase));

    FIREBASE_ADMIN.initializeApp({ credential: FIREBASE_ADMIN.credential.cert(CERTIFICATE) });

    const FIRESTORE = FIREBASE_ADMIN.firestore();

    const CLIENT = MQTT.connect(host, { username, password });

    CLIENT.on("connect", () => {
      console.log(`\n[log] connected to ${host}\n`);

      topics.split(",").forEach(tpc => {
        CLIENT.subscribe(tpc);
      });
    });

    CLIENT.on("message", (tpc, msg) => {
      const TIME = Date.now();
      const MESSAGE = JSON.parse(msg.toString());
      const DATA = { time: TIME, topic: tpc, message: MESSAGE[0] }; //MESSAGE[0] can be replaced by what you want to dump

      console.log(DATA);
      console.log("\n");

      FIRESTORE.collection("MQTT")
        .doc(TIME.toString())
        .set(DATA);
    });

    CLIENT.on("close", () => {
      console.log(`\n[log] disconnected from ${host}\n`);
    });
  })
  .parse(process.argv);
