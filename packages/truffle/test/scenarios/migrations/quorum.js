const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const path = require("path");
const assert = require("assert");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");
const Web3 = require("web3");

const log = console.log;

function processErr(err, output) {
  if (err) {
    log(output);
    throw new Error(err);
  }
}

describe("migrate with [ @quorum ] interface", function() {
  if (!process.env.QUORUM) return;
  let config;
  let web3;
  let networkId;
  const project = path.join(__dirname, "../../sources/migrations/quorum");
  const logger = new MemoryLogger();

  before(async function() {
    this.timeout(10000);
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    };

    const provider = new Web3.providers.HttpProvider("http://localhost:22000", {
      keepAlive: false
    });
    web3 = new Web3(provider);
    networkId = await web3.eth.net.getId();
  });

  it("runs migrations (sync & async/await)", function(done) {
    this.timeout(70000);

    CommandRunner.run("migrate", config, err => {
      const output = logger.contents();
      processErr(err, output);

      assert(output.includes("Saving successful migration to network"));
      assert(!output.includes("Error encountered, bailing"));
      assert(!output.includes("invalid or does not take any parameters"));

      const location = path.join(
        config.contracts_build_directory,
        "UsesExample.json"
      );
      const artifact = require(location);
      const network = artifact.networks[networkId];

      assert(output.includes(network.address));

      console.log(output);
      done();
    });
  });
});
