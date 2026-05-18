
const excelSerialToJS = (serial) => {
    if (!serial) return null;
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
};

console.log('46024:', excelSerialToJS(46024));
console.log('46036:', excelSerialToJS(46036));
