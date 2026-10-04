import fs from "node:fs";
const data = JSON.parse(fs.readFileSync("public/data/medya-listesi.json","utf8"));
console.log("catalog entries:", data.length);
for (const x of data) console.log(x.path);
