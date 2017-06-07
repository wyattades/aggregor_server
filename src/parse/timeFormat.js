/*
FYI: This is a proof of concept function I wrote for fun

Convert time string to millisecond time format
ex: '10 minutes ago' -> (currentTime - 10 minutes)
*/

const units = {};
units.second = 1000;
units.minute = units.second * 60;
units.hour = units.minute * 60;
units.day = units.hour * 24;
units.month = units.day * 30.42;
units.year = units.day * 365;

module.exports = string => new Promise((resolve, reject) => {

  if (typeof string !== 'string') {
    return reject();
  }

  const currentTime = Date.now();
    
  if (/ago|past/.test(string)) {
    
    function timeAgo(unitAmount) {
      for (let unit in units) {
        if (units.hasOwnProperty(unit) &&
        string.includes(unit)) {
          
          return resolve(new Date(
            currentTime - unitAmount * units[unit]
          ).getTime());
        }
      }
      reject();
    }
    
    if (string.includes('few')) {
      timeAgo(3);
    } else {
      const unitAmount = parseInt(string.replace(/[^\d.]/g, ''), 10);
      if (!isNaN(unitAmount)) {
        timeAgo(unitAmount);
      } else if (/\ban?\b/.test(string)) {
        timeAgo(1);
      } else {
        reject();
      }
    }
  } else if(/just|now/.test(string)) {
    resolve(currentTime);
  } else {
    const testDate = new Date(string);
    if (testDate !== 'Invalid Date' && !isNaN(testDate)) {
      resolve(testDate.getTime());
    } else {
      reject();
    }
  }
});