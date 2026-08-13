async function test() {
    try {
        console.log("Attempting dynamic import via eval...");
        const fileType = await (eval('import("file-type")'));
        console.log("Success! Imported file-type:", Object.keys(fileType));
    } catch (err: any) {
        console.error("Failed to import:", err);
    }
}
test();
