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
      const T = Date.now();
      const MESSAGE = JSON.parse(msg.toString());

      const PREHOUR = Number(MESSAGE[0].time.substring(11, 13)) + 8;
      const HOUR = PREHOUR >= 24 ? PREHOUR - 24 : PREHOUR;
      const TIME = MESSAGE[0].time.substring(0, 11) + HOUR + MESSAGE[0].time.substring(13, 19);
      const FLAG = MESSAGE[0].data.substring(2, 4);
      const TEMPERATURE = FLAG === "67" ? parseInt(MESSAGE[0].data.substring(4, 8), 16) * 0.1 : "null";
      const HUMIDITY = FLAG === "67" ? parseInt(MESSAGE[0].data.substring(12, 14), 16) * 0.5 : "null";
      const BAROMETER = FLAG === "67" ? parseInt(MESSAGE[0].data.substring(18, 22), 16) * 0.1 : "null";
      const ACC_X = FLAG === "71" ? parseInt(MESSAGE[0].data.substring(4, 8), 16) * 0.001 : "null";
      const ACC_Y = FLAG === "71" ? parseInt(MESSAGE[0].data.substring(8, 12), 16) * 0.001 : "null";
      const ACC_Z = FLAG === "71" ? parseInt(MESSAGE[0].data.substring(12, 16), 16) * 0.001 : "null";
      const LATITUDE = FLAG === "88" ? parseInt(MESSAGE[0].data.substring(4, 12), 16) * 0.0001 : "null";
      const LONGTITUDE = FLAG === "88" ? parseInt(MESSAGE[0].data.substring(12, 20), 16) * 0.0001 : "null";

      const INFO = {
        topic: tpc,
        macaddr: MESSAGE[0].macAddr,
        time: TIME,
        data: MESSAGE[0].data,
        temperature: TEMPERATURE,
        humidity: HUMIDITY,
        barometer: BAROMETER,
        acc_x: ACC_X,
        acc_y: ACC_Y,
        acc_z: ACC_Z,
        latitude: LATITUDE,
        longtitude: LONGTITUDE
      };

      if (INFO.macaddr === "00000000aa44e7b3") {
        //console.log(MESSAGE[0]);
        console.log(INFO);
        console.log("\n");

        FIRESTORE.collection("MQTT")
          .doc(TIME.toString())
          .set(INFO);
      }
    });

    CLIENT.on("close", () => {
      console.log(`\n[log] disconnected from ${host}\n`);
    });
  })
  .parse(process.argv);
