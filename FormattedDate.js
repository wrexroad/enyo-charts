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
          return this.stringToDate(val);
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
      stringDelta: 4, //differnce between the length of the code (includiing %%) and the resulting string
      get: function(date) {
        return date.getUTCHours() > 12 ? "pm" : "am";
      },
      set: function(date, val) {
        date.setUTCHours(date.getUTCHours+(val.toLowerCase() == "am" ? 0 : 12));
      }
    },
    "AMPM" : {
      stringDelta: 4,
      get: function(date) {
        return date.getUTCHours() > 12 ? "PM" : "AM";
      },
      set: function(date, val) {
        date.setUTCHours(date.getUTCHours+(val.toLowerCase() == "am" ? 0 : 12));
      }
    },
    "ms": {
      stringDelta: 2,
      get: function(date) {
        return date.getUTCMilliseconds();
      },
      set: function(date, val) {
        date.setUTCMilliseconds(val);
      }
    },
    "ss": {
      stringDelta: 2,
      get: function(date) {
        var seconds = date.getUTCSeconds();
        return (seconds < 10 ? "0" : "") + seconds;
      },
      set: function(date, val) {
        date.setUTCSeconds(val);
      }
    },
    "mm": {
      stringDelta: 2,
      get: function(date) {
        var min = date.getUTCMinutes();
        return (min < 10 ? "0" : "") + min;
      },
      set: function(date, val) {
        date.setUTCMinutes(val);
      }
    },
    "HH": {
      stringDelta: 2,
      get: function(date) {
        var hours = date.getUTCHours();
        return (hours < 10 ? "0" : "") + hours;
      },
      set: function(date, val) {
        date.setUTCHours(val);
      }
    },
    "hh": {
      stringDelta: 2,
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
      stringDelta: 2,
      get: function(date) {
        var dom = date.getUTCDate();
        return (dom < 10 ? "0" : "") + dom;
      },
      set: function(date, val) {
        date.setUTCDate(val);
      }
    },
    "DOW": {
      stringDelta: 4,
      get: function(date) {
        return date.getUTCDay();
      },
      set: function(date, val) {
        return date.setUTCDay(val);
      },
    },
    "DOY": {
      stringDelta: 2,
      get: function(date) {
        var ms, day, zeros;
        
        //find out how many milliseconds have
        //elapsed since the start of the year
        ms = date - (+(new Date(date.getUTCFullYear(), 0, 0)));
    
        //convert ms to full days that have elapsed
        day = (ms / 86400000) >> 0;
    
        //get zeros for paddings
        zeros = day < 10 ? "00" : day < 100 ? "0" : "";
    
        return zeros + day;
      },
      set: function() {
        
      }
    },
    "MM": {
      stringDelta: 2,
      get: function(date) {
        var month = date.getUTCMonth() + 1;
        return (month < 10 ? "0" : "") + month;
      },
      set: function(date, val) {
        date.setUTCMonth(val - 1);
      }
    },
    "YYYY": {
      stringDelta: 2,
      get: function(date) {
        return date.getUTCFullYear();
      },
      set: function(date, val) {
        date.setUTCFullYear(val);
      }
    },
    "YY": {
      stringDelta: 2,
      get: function(date) {
        return date.getUTCFullYear() % 2000;
      },
      set: function(date, val) {
        date.setUTCFullYear(val + 2000);
      }
    },
    "T": {
      stringDelta: -6,
      get: function() {
        return "GMT" + (this.timeZone < 0 ? "" : "+") + this.timeZone;
      },
      set: function(date, val) {
        date.setUTCHours(date.getUTCHours + val);
      }
    } 
  },
  
  formatChanged: function() {
    //make sure format is a string because we are about
    //to do some really stringy stuff to it
    var format = ((this.format || "") + "");
    
    //split up the format string
    this._format = format.split("%");
  },
  
  dateToString: function(date) {
    var convertedDate = [];

    //make sure the date is a Date object
    date = new Date(date);

    //adjust the date based on the time zone
    date.setUTCHours(date.getUTCHours() + this.timeZone);

    //convert any format codes to the date value
    this._format.forEach(function(fmtCode) {

      convertedDate.push(this.formatCodes[fmtCode] ?
        this.formatCodes[fmtCode].get.call(this, date) : fmtCode
      );
    }, this);

    return convertedDate.join("");
  },
  
  stringToDate: function(dateString) {
    var
      date = new Date(),
      stringIndex = 0,
      twentyfourhour = true,
      dateCodes;
    
    //check for a few key words
    if (dateString.toLowerCase() == "now") {
      return +date;
    } else if (dateString.toLowerCase() == "today") {
      return ((+date / 86400000) >> 0) * 86400000;
    } else if (dateString.toLowerCase() == "yesterday") {
      return this.stringToDate("today") - 86400000;
    } else if (dateString.toLowerCase() == "tomorrow") {
      return this.stringToDate("today") + 86400000;
    } else {
      date = new Date(0);
    }
    
    //break the date format appart into elements
    dateCodes = this._format.match("%");
    
    dateCodes.forEach(function(code) {
      if (!this.formatCodes[code]) {
        stringIndex += code.length;
      } else {
        stringIndex += (code.length - this.formatCodes[code].stringDelta);
      }
    });   
  }
});