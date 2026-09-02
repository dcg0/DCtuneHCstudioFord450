const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// En web no existe el módulo nativo de Bluetooth clásico: se sustituye por un stub.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-bluetooth-classic") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "src/bluetooth-classic.web.js"),
    };
  }
  return (originalResolveRequest || context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
