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
  },
  
  isValidRange: function() {
    //make sure there is a valid min and max: two numbers that are not equal.
    if (this.min >= this.max) {
      return false;
    } else if (!Number.isFinite(this.min + this.max)) {
      return false;
    }
    
    this.range = this.max - this.min;
    
    return true;
  },
  
  calcDigits: function() {
    var expMin, expMax, expRange, minMag, maxMag;
    
    expMin = this.min.toExponential();
    expMax = this.max.toExponential();
    minMag = +expMin.substring(expMin.indexOf("e") + 1);
    maxMag = +expMax.substring(expMax.indexOf("e") + 1);
      
    //if this.max is above 1 find the whole number rounding digit
    if (this.max > 1) {
      //if minMag is negative, that means this.min is less than 1,
      //but we are dealing with whole numbers, so just make it 0
      minMag = Math.max(minMag, 0);
      
      //we will round at 1 lower than the difference of the two magnitudes
      this.roundingDigit = maxMag - minMag - 1;
      //if we are rounding to the 1's place, display one fractional digit
      this.fractionDigits = this.roundingDigit <= 1 ? 1 : 0;
    } else {
      //this.max is below 0 (and so is this.min if the range is valid)
      //we need to figure out how many fractional digits should be displayed
      expRange = (this.max - this.min).toExponential();
      this.fractionDigits =
        (+expRange.substring(expRange.indexOf("e-") + 2)) + 1;
      this.roundingDigit = -(this.fractionDigits - 1);
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