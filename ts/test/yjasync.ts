export class YAsync {
    public static series(arr, cb) {
        let mIndex = 0;
        const lstResult = [];

        function funcCallback(err, data) {
            if (err) {
                cb(err, lstResult);
                return;
            } else {
                lstResult.push(data);
            }

            mIndex++;

            if (mIndex < arr.length) {
                arr[mIndex](funcCallback);
            } else {
                cb(null, lstResult);
            }
        }

        if (arr.constructor !== Array || arr.length === 0) {
            throw new Error("Not an array");
        }

        arr.forEach((e) => {
            if (typeof e !== "function") {
                throw new Error("Not a function");
            }

        });

        arr[0](funcCallback);
    }
}
