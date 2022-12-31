export default class RequestDataGenerator {
    constructor(fuzzRelatedData) {
        this.fuzzRelatedData = fuzzRelatedData;
        this.requests = [];
    }

    computeRequestData() {
        const urlsToFuzz = this.fuzzRelatedData.urls;
        const methods = this.fuzzRelatedData.methods;
        const statusCodes = this.fuzzRelatedData.statusCodes;
        for(let i = 0; i < urlsToFuzz.length; i++){
            const url = urlsToFuzz[i];
            const method = methods[i];
            const statusCode = statusCodes[i];
            this.requests.push({url: url, method: method, statusCode: statusCode});
        }
        return this.requests;
    }
}