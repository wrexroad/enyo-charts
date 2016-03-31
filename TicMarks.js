enyo.kind({
  name: "TicMarks",
  kind: "Component",
  published: {
    min: null,
    max: null,
    range: null,
    ticStep: null,
    fractionDigits: 0,
    roundingDigit: 0,
    type: "",
    tics: null,
    formatter: null,
    numTics: 10
  },
  constructor: function(opts) {
    this.inherited(arguments);
    
    //create a place to store generated tics
    this.tics = [];
    
    //create the internal format function
    this._format = null;
    this.setFormatter(opts.formatter || this.defaultFormat);
  },
  
  defaultFormat: {
    type: "function",
    formatFunction: function(val) {
      return (+val).toFixed(this.fractionDigits);
    }
  },
  
  //make sure min and max are set as Numbers
  minChanged: function() {
    this.min = +this.min;
  },
  maxChanged: function() {
    this.max = +this.max;
  },
  
  observers: {
    generateTics: ["min", "max", "numTics"],
  },
  
  generateTics: function() {
    var
      multiplier, roundMin, roundMax, scaledRange,
      oneTicsNum, halfTicsNum, fithsTicsNum, ticVal;
    
    if (!this.isValidRange()) {
      return false;
    }
    
    this.tics = [];
    
    //figure out how many meaningfull decimal places the min and max have
    this.calcDigits();
    
    //get the rounded min and max
    multiplier = Math.pow(10, this.roundingDigit);
    roundMin = ((this.min / multiplier) >> 0) * multiplier;
    roundMax = ((this.max / multiplier) >> 0) * multiplier;
    
    //figure out if we are going to be counting by 0.2, 0.5, or 1
    scaledRange = ((this.range / multiplier) >> 0);
    
    oneTicsNum = Math.abs(scaledRange - this.numTics);
    halfTicsNum = Math.abs((scaledRange << 1) - this.numTics);
    fithsTicsNum = Math.abs((scaledRange * 5) - this.numTics);
    
    if (oneTicsNum < halfTicsNum) {
      if (oneTicsNum < fithsTicsNum) {
        this.ticStep = 1;
      } else {
        this.ticStep = 0.2;
      }
    } else {
      if (halfTicsNum < fithsTicsNum) {
        this.ticStep = 0.5;
      } else {
        this.ticStep = 0.2;
      }
    }
    
    //scale the ticStep to the rounding digit
    this.ticStep *= multiplier;
    
    //generate the tic labels and locations
    ticVal = roundMin;
    while (ticVal <= roundMax) {
      this.tics.push({
        location: ticVal,
        label: this._format(ticVal)
      });
      ticVal += this.ticStep;
    }
    
    console.log(this.tics);
  },
  
  isValidRange: function() {
    //make sure there is a valid min and max: two numbers that are not equal.
    if (this.min == this.max) {
      return false;
    } else if (!Number.isFinite(this.min + this.max)) {
      return false;
    }
    
    this.range = this.max - this.min;
    
    return true;
  },
  
  calcDigits: function() {
    var expRange, expDelim;
     
    expRange = (this.max - this.min).toExponential();
    expDelim = expRange.indexOf("e-");
    
    if (expDelim > -1) {
      //the range has a negative exponent,
      //so we will be rounding to a fractional digit
      this.fractionDigits = (+expRange.substring(expDelim + 2)) + 1;
      this.roundingDigit = -(this.fractionDigits - 1);
    } else {
      //there is a positive exponent so we want to deal with integers
      this.fractionDigits = 0;
      this.roundingDigit = (+expRange.substring(expRange.indexOf("e+")+2)) - 1;
    }
  },
  
  setFormatter: function(formatter) {
    
    if (!formatter || !formatter.type) {
      this.setDefaultFormatter();
      return;
    }
    this.formatter = formatter;
    
    if (formatter.type == "function") {
      this._format = function (val) {
        //when we generate a tic mark, call the provided function with 
        //'this' pointing a the formatter object.
        //The function should be ready to take the parameters:
        //value, min tic mark, and max tic mark
        return formatter.formatFunction.call(this, val);
      }
    } else if (formatter.type == "range") {
      if (!formatter.labels) {
        this.setDefaultFormatter();
        return;
      }
      
      this._format = function (val) {
        var labelObj, label_i;
        
        for (label_i in formatter.labels) {
          labelObj = formatter.labels[label_i] || {};
          if (val >= labelObj.min && val <= labelObj.max) {
            return label_i;
          }
        }
        
        return "";
      }
    } else if (formatter.type == "discrete") {
      if (!formatter.labels) {
        this.setDefaultFormatter();
        return;
      }
      
      this._format = function (val) {
        var
          distances = {},
          label_i, result;
        
        //get the distance from each label's value to the target
        for (label_i in formatter.labels) {
          distances[Math.abs(formatter.labels[label_i].value - val)] = label_i;
        }
        
        //return the closest label to the target
        result = formatter.labels[Math.min.apply(this, distances.keys())];
        return result === 0 ? "0" : (result || "");
      }
    }
  },
  setDefaultFormatter: function() {
    this.setFormatter(
      this.defaultFormat.type ?
        this.defaultFormat : {type: "function", formatFunction: function(){}}
    );
  }
});