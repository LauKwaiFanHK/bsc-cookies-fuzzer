import OpenApiParser from "./OpenApiParser.js";

export async function startOpenApiValidation(openApiFilePath){
    //-------------------Start of OpenAPI specification validation----------------
    const myOpenApiParser = new OpenApiParser();
    console.log("------OpenAPI file validation result------");
    const apiData = await myOpenApiParser.validateOpenApiSpec(
        openApiFilePath
    );
    return apiData;
}