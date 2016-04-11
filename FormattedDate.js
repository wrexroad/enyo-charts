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
    "ampm" : function(date) {
      return date.getUTCHours() > 12 ? "pm" : "am";
    },
    "AMPM" : function(date) {
      return date.getUTCHours() > 12 ? "PM" : "AM";
    },
    "ms": function(date) {
      return date.getUTCMilliseconds()
    },
    "ss": function(date) {
      var seconds = date.getUTCSeconds();
      return (seconds < 10 ? "0" : "") + seconds;
    },
    "mm": function(date) {
      var min = date.getUTCMinutes();
      return (min < 10 ? "0" : "") + min;
    },
    "HH": function(date) {
      var hours = date.getUTCHours();
      return (hours < 10 ? "0" : "") + hours;
    },
    "hh": function(date) {
      var hours = date.getUTCHours();
      hours -= (hours > 12 ? 12 : 0);
      return (hours < 10 ? "0" : "") + hours;
    },
    "DD": function(date) {
      var dom = date.getUTCDate();
      return (dom < 10 ? "0" : "") + dom;
    },
    "DOW": function(date) {
      return date.getUTCDay();
    },
    "DOY": function(date) {
      var ms, day, zeros;
      
      //find out how many milliseconds have elapsed since the start of the year
      ms = date - (+(new Date(date.getUTCFullYear(), 0, 0)));
  
      //convert ms to full days that have elapsed
      day = (ms / 86400000) >> 0;
  
      //get zeros for paddings
      zeros = day < 10 ? "00" : day < 100 ? "0" : "";
  
      return zeros + day;
    },
    "MM": function(date) {
      var month = date.getUTCMonth() + 1;
      return (month < 10 ? "0" : "") + month;
    },
    "YYYY": function(date) {
      return date.getUTCFullYear();
    },
    "YY": function(date) {
      return date.getUTCFullYear() % 2000;
    },
    "T": function() {
      return "GMT" + (this.timeZone < 0 ? "" : "+") + this.timeZone;
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
        this.formatCodes[fmtCode].call(this, date) : fmtCode
      );
    }, this);

    return convertedDate.join("");
  },
  
  stringToDate: function(dateString) {
    var
      date = +(new Date()),
      stringIndex = 0,
      dateCodes;
    
    //check for a few key words
    if (dateString.toLowerCase() == "now") {
      return date;
    } else if (dateString.toLowerCase() == "today") {
      return ((date / 86400000) >> 0) * 86400000;
    } else if (dateString.toLowerCase() == "yesterday") {
      return this.stringToDate("today") - 86400000;
    } else if (dateString.toLowerCase() == "tomorrow") {
      return this.stringToDate("today") + 86400000;
    }
    
    //break the date format appart into elements
    dateCodes = this.dateFormat.match("%");
    
    dateCodes.forEach(function(code) {
      
    });   
  }
});