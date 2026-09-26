// ======================================
// Sentinel SIEM - Database Seeder
// seed.js
//
// Populates MongoDB with a realistic week of SOC activity so the dashboard
// has something to show on first run.
//
//   npm run seed          wipe the demo collections and reseed
//   npm run seed -- --keep  append without wiping
// ======================================

require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("./config/database");

const Log = require("./models/Log");
const Alert = require("./models/Alert");
const Incident = require("./models/Incident");
const User = require("./models/User");
const Settings = require("./models/Settings");
const Counter = require("./models/Counter");

// ---------- Sample vocabulary ----------

const SOURCES = [
    "Firewall",
    "IDS",
    "WAF",
    "Antivirus",
    "Auth Service",
    "Web Server",
    "VPN Gateway",
    "Endpoint Agent"
];

const EVENT_TYPES = [
    "User Login",
    "Failed Login",
    "Port Scan",
    "SQL Injection",
    "Malware Detection",
    "File Modified",
    "Privilege Escalation",
    "DDoS Traffic",
    "XSS Attempt",
    "Brute Force",
    "Firewall Block",
    "Data Exfiltration",
    "Suspicious Process",
    "Certificate Mismatch"
];

const ATTACK_TYPES = [
    "SQL Injection",
    "Port Scan",
    "Malware",
    "Brute Force",
    "DDoS Attack",
    "XSS Attack",
    "Ransomware",
    "Privilege Escalation"
];

const INCIDENT_TITLES = [
    "SQL Injection Attack",
    "Port Scan Detected",
    "Malware Infection",
    "Brute Force Attack",
    "DDoS Attempt",
    "XSS Attack",
    "Privilege Escalation",
    "Unauthorized Access"
];

const LOG_STATUSES = ["New", "Monitoring", "Closed"];

const ANALYSTS = [
    "John",
    "Alice",
    "David",
    "Michael",
    "Sophia"
];

const SEVERITIES = ["Low", "Medium", "High", "Critical"];

// Relative weights, so Critical and High are uncommon and the dashboard
// does not look uniformly alarming
const SEVERITY_WEIGHTS = [0.46, 0.3, 0.17, 0.07];

// ---------- Helpers ----------

const pick = (list) => list[Math.floor(Math.random() * list.length)];

const pickWeighted = (list, weights) => {

    const roll = Math.random();

    let cumulative = 0;

    for (let i = 0; i < list.length; i++) {
        cumulative += weights[i];
        if (roll < cumulative) {
            return list[i];
        }
    }

    return list[list.length - 1];

};

const randomIp = () => {

    return `192.168.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}`;

};

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000);

// ======================================
// Seed
// ======================================

const seed = async () => {

    const keep = process.argv.includes("--keep");

    console.log("🌱 Seeding Sentinel SIEM");

    await connectDB();

    if (!keep) {

        console.log("   Clearing existing logs, alerts, incidents and users");

        await Promise.all([
            Log.deleteMany({}),
            Alert.deleteMany({}),
            Incident.deleteMany({}),
            User.deleteMany({}),
            Counter.deleteMany({})
        ]);

    }

    // ---------- Users ----------

    const existingAdmins = await User.countDocuments({ role: "admin" });

    if (existingAdmins === 0) {

        const users = [
            {
                username: "admin",
                displayName: "System Administrator",
                role: "admin",
                password: User.hashPassword("admin123")
            },
            ...ANALYSTS.map(name => ({
                username: name.toLowerCase(),
                displayName: name,
                role: "analyst",
                password: User.hashPassword("analyst123")
            }))
        ];

        await User.insertMany(users);

        console.log(`   Created ${users.length} users (admin / admin123)`);

    } else {
        console.log("   Users already present, skipping");
    }

    // ---------- Settings ----------

    await Settings.findOneAndUpdate(
        { key: "soc" },
        {
            $setOnInsert: {
                key: "soc",
                organisationName: "Sentinel SIEM",
                refreshInterval: 10000,
                logRetentionDays: 90,
                autoEscalateSeverity: "High",
                maskIpInReports: false
            }
        },
        { upsert: true }
    );

    console.log("   Settings document ready");

    // ---------- Logs ----------
    // Weighted toward the last 24h so the dashboard timeline is populated

    const logDocs = [];

    for (let i = 0; i < 700; i++) {

        // 60% of events land in the last day, the rest spread over a week
        const spread = i % 10 < 6
            ? Math.random() * 24 * 60
            : 24 * 60 + Math.random() * 6 * 24 * 60;

        const severity = pickWeighted(SEVERITIES, SEVERITY_WEIGHTS);

        logDocs.push({
            timestamp: minutesAgo(spread),
            source: pick(SOURCES),
            eventType: pick(EVENT_TYPES),
            severity,
            message: `${pick(EVENT_TYPES)} observed by ${pick(SOURCES)}`,
            ipAddress: randomIp(),
            status: pick(LOG_STATUSES)
        });

    }

    const logs = await Log.insertMany(logDocs);

    console.log(`   Inserted ${logs.length} logs`);

    // ---------- Alerts ----------
    // Escalate the High and Critical logs into alerts

    const escalatable = await Log.find({
        severity: { $in: ["High", "Critical"] }
    }).sort({ timestamp: -1 })
        .limit(60);

    const alertDocs = escalatable.map(log => ({
        timestamp: log.timestamp,
        severity: log.severity,
        status: pick(["Open", "Open", "Acknowledged", "Resolved"]),
        sourceIp: log.ipAddress,
        attackType: log.eventType,
        description: `${log.eventType} detected by ${log.source} from ${log.ipAddress}`,
        log: log._id
    }));

    const alerts = alertDocs.length
        ? await Alert.insertMany(alertDocs)
        : [];

    console.log(`   Inserted ${alerts.length} alerts`);

    // ---------- Incidents ----------
    // The most severe open alerts become incidents

    const severe = alerts
        .filter(alert => alert.severity === "Critical" || alert.status === "Open")
        .slice(0, 18);

    const incidentDocs = severe.map((alert, index) => {

        const status = pick(["Open", "In Progress", "Closed"]);

        return {
            incidentId: `INC-${1001 + index}`,
            timestamp: alert.timestamp,
            priority: alert.severity,
            status,
            title: pick(INCIDENT_TITLES),
            description: alert.description,
            assignedTo: status === "Open" ? "Unassigned" : pick(ANALYSTS),
            assignedAt: status === "Open" ? null : new Date(),
            closedAt: status === "Closed" ? new Date() : null,
            resolution: status === "Closed" ? "Containment verified, no further action required." : "",
            alerts: [alert._id]
        };

    });

    const incidents = incidentDocs.length
        ? await Incident.insertMany(incidentDocs)
        : [];

    console.log(`   Inserted ${incidents.length} incidents`);

    // ---------- Counter ----------
    // Park the sequence just past the ids we just used by hand

    await Counter.findOneAndUpdate(
        { key: "incident" },
        { $set: { value: 1000 + incidents.length } },
        { upsert: true }
    );

    console.log("   Incident id counter aligned");

    // ---------- Summary ----------

    const [logCount, alertCount, incidentCount, userCount] = await Promise.all([
        Log.countDocuments(),
        Alert.countDocuments(),
        Incident.countDocuments(),
        User.countDocuments()
    ]);

    console.log("");
    console.log("✅ Seed complete");
    console.log(`   logs:      ${logCount}`);
    console.log(`   alerts:    ${alertCount}`);
    console.log(`   incidents: ${incidentCount}`);
    console.log(`   users:     ${userCount}`);
    console.log("");
    console.log("   Log in with  admin / admin123");
    console.log("");

    await mongoose.disconnect();

};

// Run and surface any failure with a non-zero exit
seed().catch((error) => {

    console.error("❌ Seed failed");
    console.error(error.message);

    process.exit(1);

});
