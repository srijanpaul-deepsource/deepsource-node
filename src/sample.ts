import DeepSourceAPI from ".";
// import { inspect } from "util";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const ds = new DeepSourceAPI(process.env.DS_PAT);
  // const repo = await ds.getRepo("demo-javascript", "srijanpaul-deepsource");
  const data = await ds.getAllIssuesInRepo(
    "demo-javascript",
    "srijanpaul-deepsource"
  );
  console.log(data);
}

main();
