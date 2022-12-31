import SwaggerParser from "@apidevtools/swagger-parser";
import PreTestLogger from "./Logger/PreTestLogger.js";

export default class OpenApiParser {
  constructor() {
    this.fullUrlsToFuzz = [];
    this.methods = [];
    this.statusCodes = [];
  }

  async validateOpenApiSpec(spec) {
    try {
      const api = await SwaggerParser.validate(spec);
      PreTestLogger.success(
        `Valid OpenAPI specification. API name: ${api.info.title}, Version: ${api.info.version}`
      );
      // get REST API domain
      const domainURL = api.servers[0].url;
      // get an array of endpoints
      const allEndpoints = Object.keys(api.paths);
      // get all methods of each endpoint
      for (let endpoint of allEndpoints) {
        const methods = Object.keys(api.paths[endpoint]);
        for (let m of methods) {
          const allStatusCode = Object.keys(
            api.paths[endpoint][m]["responses"]
          );
          const urlToFuzz = domainURL + endpoint;
          this.fullUrlsToFuzz.push(urlToFuzz);
          this.methods.push(m);
          this.statusCodes.push(allStatusCode);
        }
      }
      const auth = api.components.securitySchemes;

      return {
        urls: this.fullUrlsToFuzz,
        methods: this.methods,
        statusCodes: this.statusCodes,
        auth: auth,
      };
    } catch (err) {
      PreTestLogger.error(
        `Invalid OpenAPI specification: ${err.name} - ${err.message}`
      );
    }
  }
}
