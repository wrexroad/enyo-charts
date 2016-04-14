enyo.kind({
  kind: "Component",
  name: "FormattedDate",
  published: {
    unixTime: 0,
    jsTime: 0,
    timeZone: 0,
    formattedText: "",
    format: "%YYYY%-%MM%-%DD% %hh%:%mm%:%ss%.%ms% %AMPM% %T%"
  },
  constructor: function () {
    this.inherited(arguments);
    this.formatChanged();
  },
  bindings: [
    {
      from: "jsTime", to: "unixTime",
      oneWay: false, transform: function (val, dir) {
        if (dir == 1) {
          return (val / 1000);
        } else if (dir == 2) {
          return val * 1000;
        }
      }
    },
    {
      from: "jsTime", to: "formattedText",
      oneWay: false, transform: function (val, dir) {
        if (dir == 1) {
          return this.dateToString(val);
        } else if (dir == 2) {
          return this.stringToDateStamp(val);
        }
      }
    }
  ],
  timeZoneChanged: function() {
    var date = new Date(this.jsTime);
    date.setUTCHours(date.getUTCHours() + this.timeZone);
    this.set("jsTime", +date);
  },
  formatCodes: {
    "ampm" : {
      length: 2, //length of resulting string
      get: function(date) {
        return date.getUTCHours() > 12 ? "pm" : "am";
      },
      set: function(date, val) {
        date.setUTCHours(date.getUTCHours+(val.toLowerCase() == "am" ? 0 : 12));
      }
    },
    "AMPM" : {
      length: 2,
      get: function(date) {
        return date.getUTCHours() > 12 ? "PM" : "AM";
      },
      set: function(date, val) {
        date.setUTCHours(date.getUTCHours+(val.toLowerCase() == "am" ? 0 : 12));
      }
    },
    "ms": {
      length: 2,
      get: function(date) {
        return date.getUTCMilliseconds();
      },
      set: function(date, val) {
        date.setUTCMilliseconds(val);
      }
    },
    "ss": {
      length: 2,
      get: function(date) {
        var seconds = date.getUTCSeconds();
        return (seconds < 10 ? "0" : "") + seconds;
      },
      set: function(date, val) {
        date.setUTCSeconds(val);
      }
    },
    "mm": {
      length: 2,
      get: function(date) {
        var min = date.getUTCMinutes();
        return (min < 10 ? "0" : "") + min;
      },
      set: function(date, val) {
        date.setUTCMinutes(val);
      }
    },
    "HH": {
      length: 2,
      get: function(date) {
        var hours = date.getUTCHours();
        return (hours < 10 ? "0" : "") + hours;
      },
      set: function(date, val) {
        date.setUTCHours(val);
      }
    },
    "hh": {
      length: 2,
      get: function(date) {
        var hours = date.getUTCHours();
        hours -= (hours > 12 ? 12 : 0);
        return (hours < 10 ? "0" : "") + hours;
      },
      set: function(date, val) {
        date.setUTCHours(val);
      }
    },
    "DD": {
      length: 2,
      get: function(date) {
        var dom = date.getUTCDate();
        return (dom < 10 ? "0" : "") + dom;
      },
      set: function(date, val) {
        date.setUTCDate(val);
      }
    },
    "DOW": {
      length: 1,
      get: function(date) {
        return date.getUTCDay();
      },
      set: function(){}
    },
    "MM": {
      length: 2,
      get: function(date) {
        var month = date.getUTCMonth() + 1;
        return (month < 10 ? "0" : "") + month;
      },
      set: function(date, val) {
        date.setUTCMonth(val - 1);
      }
    },
    "DOY/YYYY": {
      length: 8,
      get: function(date) {
        var ms, day, zeros;
        
        //find out how many milliseconds have
        //elapsed since the start of the year
        ms = date - (+(new Date(date.getUTCFullYear(), 0, 0)));
    
        //convert ms to full days that have elapsed
        day = (ms / 86400000) >> 0;
    
        //get zeros for paddings
        zeros = day < 10 ? "00" : day < 100 ? "0" : "";
        
        return zeros + "" + day + "/" + date.getUTCFullYear();
      },
      set: function(date, val) {
        var datePair = val.split("/");
        date.setUTCFullYear(datePair[1]);
        date.setUTCDate((+datePair[0]));
      }
    },
    "YYYY": {
      length: 4,
      get: function(date) {
        return date.getUTCFullYear();
      },
      set: function(date, val) {
        date.setUTCFullYear(val);
      }
    },
    "YY": {
      length: 2,
      get: function(date) {
        return date.getUTCFullYear() % 2000;
      },
      set: function(date, val) {
        this.formatCodes.YYYY.set(date, (val + 2000));
      }
    },
    "T": {
      length: 5,
      get: function() {
        return "GMT" + (this.timeZone < 0 ? "" : "+") + this.timeZone;
      },
      set: function(date, val) {
        date.setUTCHours(date.getUTCHours() + (+val.substring(3)));
      }
    } 
  },
  
  formatChanged: function() {
    var stringDelta = 0, fMarks = 0;
    
    //make sure format is a string because we are about
    //to do some really stringy stuff to it
    var format = ((this.format || "") + "").trim();
    
    //split up the format string
    this._format = {
      str: format,
      elements: format.split("%"),
      offsets: {}
    };
    
    //find the offset of all known format elements
    this._format.elements.forEach(function(fmtCode) {
      if (this.formatCodes[fmtCode]) {
        //The offset is the location of where the first character of this date
        //element will appear in the converted date string.
        //Calculated as:
        //  start of format code -
        //  number of % so far -
        //  diff in length between fmt and converted strings 
        this._format.offsets[fmtCode] =
          format.indexOf(fmtCode) - (1 + fMarks) - stringDelta;
          
        //track stringDelta as the diffence between the format string
        //and the converted date string so far.
        stringDelta += (this.formatCodes[fmtCode].length - fmtCode.length) + 1;
        
        //keep track of how many formatting marks we have found
        //(2 per format code)
        fMarks += 2;
      } else {
        //subtract the length of this unformatted section from stringDelta
        stringDelta -= fmtCode.length;
      }
    }, this);
  },
  
  dateToString: function(date) {
    var convertedDate = [];

    //make sure the date is a Date object
    date = new Date(date);

    //adjust the date based on the time zone
    date.setUTCHours(date.getUTCHours() + this.timeZone);

    //convert any format codes to the date value
    this._format.elements.forEach(function(fmtCode) {

      convertedDate.push(this.formatCodes[fmtCode] ?
        this.formatCodes[fmtCode].get.call(this, date) : fmtCode
      );
    }, this);

    return convertedDate.join("");
  },
  
  stringToDateStamp: function(dateString) {
    var
      date = new Date(),
      dateStamp, elementValue;
    
    dateString = dateString.trim();
    
    //check for a few key words
    if (dateString.toLowerCase() == "now") {
      return +date;
    } else if (dateString.toLowerCase() == "today") {
      return ((+date / 86400000) >> 0) * 86400000;
    } else if (dateString.toLowerCase() == "yesterday") {
      return this.stringToDateStamp("today") - 86400000;
    } else if (dateString.toLowerCase() == "tomorrow") {
      return this.stringToDateStamp("today") + 86400000;
    } else {
      date = new Date(0);
    }
    
    this._format.elements.forEach(function(code) {
      if (this.formatCodes[code]) {
        elementValue =
          dateString.substr(
            this._format.offsets[code], this.formatCodes[code].length
          );
          
        this.formatCodes[code].set.apply(this, [date, elementValue]);
      }
    }, this);
    
    dateStamp = +date;
    
    //if we failed to get a date, try to use the javascript Date parse
    if (!isFinite(dateStamp) || dateStamp < 0) {
      dateStamp = +(new Date(dateString + ""));
    }
    
    return dateStamp;
  },
  
  getConvertedStringLength: function() {
    var totalLength = 0;
    
    this._format.elements.forEach(function(fmt_i) {
      if (this.formatCodes[fmt_i]) {
        totalLength += (+this.formatCodes[fmt_i].length);
      } else {
        totalLength += (+((fmt_i || "") + "").length);
      }
    }, this);
    
    return totalLength;
  }
});