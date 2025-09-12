const tsConfigPaths = require("tsconfig-paths");
const tsConfig = require("./tsconfig.json");

const baseUrl = "./dist"; // pointing to compiled output
tsConfigPaths.register({
  baseUrl,
  paths: {
    "@/*": ["*"],
    "@/core/*": ["core/*"],
    "@/modules/*": ["modules/*"],
    "@/legacy-types/*": ["legacy-types/*"],
    "@/integrations/*": ["integrations/*"],
    "@/db/*": ["db/*"],
    "@/syncer/*": ["syncer/*"],
    "@/mappers/*": ["mappers/*"],
  },
});

