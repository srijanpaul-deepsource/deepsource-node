import DeepSourceAPI from ".";
import { inspect } from "util";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const ds = new DeepSourceAPI(process.env.DS_PAT);
  const repo = await ds.getRepo("demo-javascript", "srijanpaul-deepsource");
  const checks = await ds.getChecksByRunId(repo.runIds[0]);
  console.log(inspect(checks, false, null, true));
}

main();
