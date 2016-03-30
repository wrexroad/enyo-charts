enyo.kind({
  name: "TicMarks",
  kind: "Component",
  published: {
    min: 0,
    max: 0,
    fractionDigits: 0,
    type: "",
    tics: null,
    formatter: null
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
  
  observers: {
    getFractionDigits: ["min", "max"],
  },
  getFractionDigits: function() {
    var
      max = this.max + "",
      min = this.min + "",
      maxDecLocation = (max).indexOf("."),
      minDecLocation = (min).indexOf("."),
      maxDecPlaces = maxDecLocation > 0 ? max.length - maxDecLocation : 0,
      minDecPlaces = minDecLocation > 0 ? min.length - minDecLocation : 0;
      
    this.fractionDigits = Math.max(minDecPlaces, maxDecPlaces) || 0;
  },
  
  setFormatter: function(formatter) {
    var numLabels, val_i;
    
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
        formatter.formatFunction.call(formatter, val, this.min, this.max);
      }
    } else if (formatter.type == "range") {
      //filter any NaNs out of the range bounds
      formatter.values = ([].concat(formatter.values)).filter(
        function (value) {
          return +value ? true : false;
        });
      
      //make sure there are still some valid bounds
      if (!formatter.values.length) {
        this.setDefaultFormater();
        return;
      }
      
      //create some labels if they are not provided
      if (!formatter.labels || !formatter.labels.length) {
        formatter.labels = [];
        formatter.labels[0] = "Below " + formatter.values[0];
        
        numLabels = formatter.values.length - 1;
        for (val_i = 0; val_i < numLabels; val_i++) {
          formatter.labels[val_i + 1] =
            formatter.values[val_i] + " - " + formatter.values[val_i + 1];
        }
        
        formatter.labels[val_i + 1] = "Above " + formatter.values[val_i];
      }
      
      //Search for the label for the region that this value falls under 
      this._format = function (val) {
        var
          labels = this.formatter.labels,
          numLabels = labels.length,
          values = this.formatter.values,
          numValues = values.length,
          lowerValue = +values[0],
          upperValue = +values[numValues - 1],
          val_i;
        
        if (val < lowerValue) {
          return this.formatter.labels[0];
        } else if (val > upperValue) {
          return this.formatter.labels[numLabels];
        }
        
        for (val_i = 1; val_i < numValues; val_i++) {
          if (val < values[val_i] && val > values[val_i - 1]) {
            return labels[val_i];
          }
        }
      }
    } else if (formatter.type == "discrete") {
      
    }
  },
  setDefaultFormatter: function() {
    this.setFormatter(
      this.defaultFormat.type ?
        this.defaultFormat : {type: "function", formatFunction: function(){}}
    );
  }
});