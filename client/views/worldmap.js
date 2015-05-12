var jsonCountries = null;
var songDateCount = [];
var datePicked = 0;
var listner = null;
var minDate, maxDate = 0;

var width = 1000;
var height = 1000;
var topo,projection,path,svg,g,countrySvg = null;
var zoom = d3.behavior.zoom().scaleExtent([1, 8]).on("zoom", move);
var colorPallet = ["#ffffcc","#d9f0a3","#addd8e","#78c679","#41ab5d","#238443","#005a32"];
var color = d3.scale.quantize().range(colorPallet);

/******************************************************************/
/********************* TEMPLATE FUNCTIONS *************************/
/******************************************************************/
Template.worldmap.rendered = function() {
  console.log('rendered');
  d3.select("svg").remove();
  d3.select(window).on("resize", throttle);
  setup(width,height);

  // get json country code
  Meteor.call('readJsonCC', function(err, result) {
    jsonCountries = result;
  });
}

Template.worldmap.helpers({
  countryCount: function() {
    return testTable.find().count();
  },
  songName: function() {
    var song = testTable.findOne();
    if(song != undefined) {
      return song.value.title;
    }
    return null;
  }
});

Template.worldmap.events({
  'click .search': function () {
    songDateCount = [];
    var title = document.getElementById("title").value;

    getData(title);
  }
});

Template.worldmap.destroyed = function () {
  this.handle && this.handle.stop();
};

/******************************************************************/
/************************ MAP FUNCTIONS ***************************/
/******************************************************************/
function setup(width,height){
  projection = d3.geo.mercator()
    .scale((width + 1) / 2 / Math.PI)
    .translate([0, 0])
    .precision(.1);

  path = d3.geo.path()
    .projection(projection);

  svg = d3.select("#container").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
    .call(zoom);

  g = svg.append("g");

  drawLegend(svg);

  d3.json("worldmap.json", function(error, world) {
    topo = topojson.feature(world, world.objects.countries).features;
    countrySvg = g.selectAll(".country").data(topo);
    draw(topo);
  });
}

function draw(topo) {
  countrySvg = countrySvg.enter().insert("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("id", function(d,i) { return d.id; })
    .style("fill", "#ccc")
    .on("click", function(d,i) {
      console.log(d.id + 'click');
      displayGraphics(d.id);
      d3.event.stopPropagation();
    });

  console.log("done drawing");
}

function move() {
  var t = d3.event.translate;
  var s = d3.event.scale;
  var h = height / 3;

  t[0] = Math.min(width / 2 * (s - 1), Math.max(width / 2 * (1 - s), t[0]));
  t[1] = Math.min(height / 2 * (s - 1) + h * s, Math.max(height / 2 * (1 - s) - h * s, t[1]));

  zoom.translate(t);
  g.style("stroke-width", 1 / s).attr("transform", "translate(" + t + ")scale(" + s + ")");
}

var throttleTimer;
function throttle() {
  window.clearTimeout(throttleTimer);
    throttleTimer = window.setTimeout(function() {
      redraw();
    }, 200);
}

function redraw() {
  console.log('redraw');
  countrySvg[0].forEach(function(c) {
    d3.select(c).style("fill", function(d,i) { return drawColorCountry(d,i)});
  });

  // get count no country found
  if(songDateCount[0] != undefined) {
    $( "#xxAmount" ).val('Times found no location: '+songDateCount[0][datePicked]);
  }
  $( "#date" ).val(dateFromDay(2015, (datePicked+1)));
}

// Create new slider
function updateSlider() {
  datePicked = 0;

  redraw();
  $( "#amount" ).val(datePicked);

  getMinMaxDates();

  // Create new slider
  $( "#slider" ).slider({
    value: minDate,
    min: minDate,
    max: maxDate,
    slide: function( event, ui ) {
      datePicked = ui.value;
      $( "#amount" ).val(datePicked);
      redraw();
    },
    stop: function(event, ui) {
      datePicked = ui.value;
      redraw();
    }
  });
}

/******************************************************************/
/************************ CALC FUNCTIONS **************************/
/******************************************************************/
function getData(title) {
  // Reset data listner
  if(listner) {
    listner.stop();
  }

  title = title == '' ? 'FourFiveSeconds': title;

  // Get song country records
  listner = Meteor.subscribe("testTable", title, function() {
    testTable.find().forEach(function(country){
      jsonCountries.forEach(function(countryJson) {
        if(countryJson['alpha-2'] == country.cc.toUpperCase()) {
          songDateCount[parseInt(countryJson['country-code'])] = country.value.counts;
        } else if(country.cc == 'xx') {
          songDateCount[0] = country.value.counts;
        }
      });
    });
    console.log(songDateCount.length + 'lenght');
    if(songDateCount.length > 0) {
      updateSlider();
    } else {
      console.log('No song found!');
    }
  });
}

function drawColorCountry(d,i) {
  var c = '#ccc';
  if(songDateCount[d.id] != undefined && songDateCount[d.id][datePicked] != 0) {
    c = color(songDateCount[d.id][datePicked]);
  }
  return c;
}

function dateFromDay(year, day){
  var date = new Date(year, 0); // initialize a date in `year-01-01`
  date = new Date(date.setDate(day)); // add the number of days
  return date.getDate()+ '-' +(date.getMonth()+1) + '-' + date.getFullYear();
}

function getMinMaxDates() {
  minDate = 365;
  maxDate = 0;
  var dates = [];

  // landen doorlopen
  songDateCount.forEach(function(country) {
    var i = 0;
    // dagen doorlopen
    country.forEach(function(plays) {
      if(plays > 0 && i < minDate) {
        minDate = i;
      } else if(plays > 0 && i > maxDate) {
        maxDate = i;
      }
      i++;
    });
  });
}

function displayGraphics(countryId) {
  var cc = '';
  // Getting cc
  jsonCountries.forEach(function(countryJson) {
    if(parseInt(countryJson['country-code']) == countryId) {
      cc = countryJson['alpha-2'];
    }
  });

  var country = testTable.findOne({'cc': cc});
  if(country) {
    console.log('info find '+ country.title);
    var count = country.value.counts;
    var data = count.slice(minDate, (maxDate+1));

    var width = 700;
    var height = 525;
    var padding = 40;

  // var date = new Date(2015, 0); // initialize a date in `year-01-01`
  // date = new Date(date.setDate(day));

    amountArray = [1,4,16,67,35,45,32,22,32,16];
    data = [];
    i = 0;
    amountArray.forEach(function(a) {
      var jsonObj = new Object();
      jsonObj.amount = a;
      jsonObj.date = new Date(2015, 4, i);
      data.push(jsonObj)
      i++;
    });
//     var jsonArg1 = new Object();
//       jsonArg1.name = 'calc this';
//       jsonArg1.value = 3.1415;
//     var jsonArg2 = new Object();
//       jsonArg2.name = 'calc this again';
//       jsonArg2.value = 2.73;

//     var pluginArrayArg = new Array();
//       pluginArrayArg.push(jsonArg1);
//       pluginArrayArg.push(jsonArg2);
// console.log(pluginArrayArg);
//     var data = [
//       {date: new Date(2011, 0, 1), amount: 1},
//       {date: new Date(2011, 0, 15), amount: 4},
//       {date: new Date(2011, 1, 1),  amount: 16},
//       {date: new Date(2011, 1, 15), amount: 67},
//       {date: new Date(2011, 2, 1),  amount: 35},
//       {date: new Date(2011, 10, 15),amount: 45},
//       {date: new Date(2011, 11, 1), amount: 32},
//       {date: new Date(2011, 11, 15), amount: 22},
//       {date: new Date(2011, 11, 22), amount: 32},
//       {date: new Date(2011, 11, 31), amount: 16}
//     ];

    // the vertical axis is a time scale that runs from 00:00 - 23:59
    // the horizontal axis is a time scale that runs from the 2011-01-01 to 2011-12-31

    var y = d3.scale.linear().domain([0, d3.max(data, function(d) { return d.amount; })]).range([0, height]);
    var x = d3.time.scale().domain([d3.min(data, function(d) { return d.date; }), d3.max(data, function(d) { return d.date; })]).range([0, width]);

    var monthNames = ["Jan", "Feb", "Mar", "April", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Sunrise and sun set times for dates in 2011. I have picked the 1st
    // and 15th day of every month, plus other important dates like equinoxes
    // and solstices and dates around the standard time/DST transition.


    // function yAxisLabel(d) {
    //   console.log(d);
    //   return d;
    // }

    // The labels along the x axis will be positioned on the 15th of the
    // month

    function midMonthDates() {
      return d3.range(0, 12).map(function(i) { return new Date(2015, i, 15) });
    }

    // function yAxisLabel() {
    //   return d3.range(0, d3.max(data, function(d) { return d.amount; })).map(function(i) { return d[i] });
    // }

    var dayLength = d3.select("#graphs").
      append("svg:svg").
      attr("width", width + padding * 2).
      attr("height", height + padding * 2);

  // create a group to hold the axis-related elements
  var axisGroup = dayLength.append("svg:g").
    attr("transform", "translate("+padding+","+padding+")");

  // draw the x and y tick marks. Since they are behind the visualization, they
  // can be drawn all the way across it. Because the  has been
  // translated, they stick out the left side by going negative.

  axisGroup.selectAll(".yTicks").
    data(y.ticks(5)).
    enter().append("svg:line").
    attr("x1", -5).
    // Round and add 0.5 to fix anti-aliasing effects (see above)
    attr("y1", function(i) { return y(i); }).
    attr("x2", width).
    attr("y2", function(i) { return y(i); }).
    attr("stroke", "lightgray").
    attr("class", "yTicks");

  axisGroup.selectAll(".xTicks").
    data(midMonthDates).
    enter().append("svg:line").
    attr("x1", x).
    attr("y1", 0).
    attr("x2", x).
    attr("y2", height+5).
    attr("stroke", "lightgray").
    attr("class", "yTicks");

  // draw the text for the labels. Since it is the same on top and
  // bottom, there is probably a cleaner way to do this by copying the
  // result and translating it to the opposite side

  // axisGroup.selectAll("text.xAxisTop").
  //   data(midMonthDates).
  //   enter().
  //   append("svg:text").
  //   text(function(d, i) { return monthNames[i]; }).
  //   attr("x", x).
  //   attr("y", -8).
  //   attr("text-anchor", "middle").
  //   attr("class", "axis xAxisTop");

  axisGroup.selectAll("text.xAxisBottom").
    data(midMonthDates).
    enter().
    append("svg:text").
    text(function(d, i) { return monthNames[i]; }).
    attr("x", x).
    attr("y", height+15).
    attr("text-anchor", "middle").
    attr("class", "xAxisBottom");

  axisGroup.selectAll("text.yAxisLeft").
    data(y.ticks(5)).
    //data(d3.range(0, d3.max(data, function(d) { return d.amount; }))).
    enter().append("svg:text").
    text(String).
    attr("x", -7).
    attr("y", function(i) { return y(i); }).
    attr("dy", "4").
    attr("class", "yAxisLeft").
    attr("text-anchor", "end");

  // axisGroup.selectAll("text.yAxisRight").
  //   data(d3.range(5, 22)).
  //   enter().
  //   append("svg:text").
  //   text(yAxisLabel).
  //   attr("x", width+7).
  //   attr("y", function(d) { return y(new Date(2011, 0, 1, d)); }).
  //   attr("dy", "3").
  //   attr("class", "yAxisRight").
  //   attr("text-anchor", "start");

  // create a group for the sunrise and amount paths

  var lineGroup = dayLength.append("svg:g").
    attr("transform", "translate("+ padding + ", " + padding + ")");

  // draw the background. The part of this that remains uncovered will
  // represent the daylight hours.

  lineGroup.append("svg:rect").
    attr("x", 0).
    attr("y", 0).
    attr("height", height).
    attr("width", width).
    attr("fill", "steelblue");

  // The meat of the visualization is surprisingly simple. sunriseLine
  // and sunsetLine are areas (closed svg:path elements) that use the date
  // for the x coordinate and sunrise and sunset (respectively) for the y
  // coordinate. The sunrise shape is anchored at the top of the chart, and
  // sunset area is anchored at the bottom of the chart.

  // var sunriseLine = d3.svg.area().
  //   x(function(d) { return x(d.date); }).
  //   y1(function(d) { return y(new Date(2011, 0, 1, d.sunrise[0], d.sunrise[1])); }).
  //   interpolate("linear");

  // lineGroup.
  //   append("svg:path").
  //   attr("d", sunriseLine(data)).
  //   attr("fill", "steelblue");

  var sunsetLine = d3.svg.area().
    x(function(d) { return x(d.date); }).
    //y0(height).
    y1(function(d) { return y(d.amount); }).
    interpolate("linear");

  lineGroup.append("svg:path").
    attr("d", sunsetLine(data)).
    attr("fill", "lightyellow");

  // finally, draw a line representing 12:00 across the entire
  // visualization

  // lineGroup.append("svg:line").
  //   attr("x1", 0).
  //   attr("y1", d3.round(y(new Date(2011, 0, 1, 12))) + 0.5).
  //   attr("x2", width).
  //   attr("y2", d3.round(y(new Date(2011, 0, 1, 12))) + 0.5).
  //   attr("stroke", "lightgray");

  } else {
    console.log('no info find '+ cc);
  }
}

function drawLegend(svg) {
  var keyheight = 15, keywidth = 40;
  var x = d3.scale.linear().domain([0, 1]);
  var quantize = d3.scale.quantize().domain([0, 1]).range(colorPallet);
  var ranges = quantize.range().length;

  // return quantize thresholds for the key
  var qrange = function(max, num) {
      var a = [];
      for (var i=0; i<num; i++) {
          a.push(i*max/num);
      }
      return a;
  }

  // return string
  var textLegend = function (index, lengthLegend) {
    var indexText = '';
    if(index == 0) {
      indexText = 'Low';
    } else if(index == lengthLegend) {
      indexText = 'High';
    }
    return indexText;
  }

  // make legend
  var legend = svg.append("g")
    .attr("transform", "translate (400,-480)")
    .attr("class", "legend");

  // make quantized key legend items
  var li = legend.append("g")
    .attr("transform", "translate (8,0)")
    .attr("class", "legend-items");

  li.selectAll("rect")
    .data(quantize.range().map(function(color, i) {
      return color;
    }))
    .enter().append("rect")
    .attr("y", function(d, i) { return i*keyheight; })
    .attr("width", keywidth)
    .attr("height", keyheight)
    .style("fill", function(d, i) { return colorPallet[i]; });

  li.selectAll("text")
    .data(qrange(quantize.domain()[1], ranges))
    .enter().append("text")
    .attr("x", 48)
    .attr("y", function(d, i) { return (i+1)*keyheight-2; })
    .text(function(d, i) { return textLegend(i, (colorPallet.length-1)); });
}