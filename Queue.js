// This module serves as a First-in-first-out (FIFO) task queue
export default class Queue {
    constructor(){
        this.dataCollection = [];
    }

    // Add a new data package to the end of queue. 
    enqueue(newData){
        this.dataCollection.push(newData);
    }

    // Return the first data package on the queue.
    dequeue(){
        const requestSequence = this.dataCollection.shift();
        return requestSequence;
    }

    getDataCollectionSize(){
        return this.dataCollection.length;
    }
}
