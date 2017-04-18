//wrap everthing in a self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var attrArray = ["Russian Federation", "Ukraine", "Kazakhstan", "Poland", "Romania"]; //list of attributes
var expressed = attrArray[0]; //initial attribute
    
//chart frame dimensons
var chartWidth = window.innerWidth * 0.48,
    chartHeight = 473,
    leftPadding = 40,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    
//create a scale to size bars proportionally to frame and for axis
var yScale = d3.scaleLinear()
    .range([463, 60])
    .domain([0, 3500]);

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = window.innerWidth * 0.47,
        height = 473;
    
    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
    
    //create Albers equal area conic projection centered on Europe
    var projection = d3.geoAlbers()
        .center([15.57, 49.91])
        .rotate([-20.48, 0.00, 0])
        .parallels([43.09, 25])
        .scale(650)
        .translate([width / 2, height / 2]);
    
    var path = d3.geoPath()
        .projection(projection);
    
    //create map title
    var mapTitle = map.append("text")
        .attr("x", 58)
        .attr("y", 35)
        .attr("class", "mapTitle")
        .text("Immigrants Into Europe, 2015");
    
    //use queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/EuropeMigrantData2015_mini.csv") //load attributes from csv
        .defer(d3.json, "data/EuropeCountries.topojson") //load choropleth data
        .defer(d3.json, "data/WorldCountries.topojson") //load background data
        .await(callback);
    
    function callback(error, csvData, europe, worldCountries){
        
        //place graticule on the map
        setGraticule(map, path);
        
        //translate europe TopoJSON
        var europeCountries = topojson.feature(europe, europe.objects.EuropeCountries).features,
            worldBorders = topojson.feature(worldCountries, worldCountries.objects.WorldCountries);
        
        //add world countries
        var backgroundCountries = map.append("path")
            .datum(worldBorders)
            .attr("class", "countries")
            .attr("d", path);
        
        //join csv data to GeoJSON enumeration units
        europeCountries = joinData(europeCountries, csvData);
        
        //create the color scale
        var colorScale = makeColorScale(csvData);
        
        //add enumeration units to the map
        setEnumerationUnits(europeCountries, map, path, colorScale);
        
        //add coordinated visualization to the map
        setChart(csvData, colorScale);
    
        //add dropdown interaction
        //createDropdown(csvData);
        
        //add info window
        desWindow();
    };
};
    
//function to create coordinated bar chart
function setChart(csvData, colorScale){
    
    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");
    
    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    
    //create a scale to size bars proportionally to frame
   /* var yScale = d3.scaleLinear()
        .range([0, chartHeight])
        .domain([-600, 20000]);
    */
    //set bars for each province
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed];
        })
        .attr("class", function(d){
            return "bars " + d.sovereignt;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        .attr("height", function(d){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        })
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);
    
    //add style descriptor to each rect
    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');
    
    //create a text element for chart title
    var chartTitle = chart.append("text")
        .attr("x", 70)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Number of Migrants from");
    
    var secondTitle = chart.append("text")
        .attr("x", 497)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("in each country (in thousands)");
    
    //create vertical axis generator
    var yAxis = d3.axisLeft(yScale);
    
    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);
    
    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    
    createDropdown(csvData);
    updateChart(bars, csvData.length, colorScale);
};

//create description window
function desWindow(){
    //create a new svg element
    var infoWindow = d3.select("body")
        .append("svg")
        .attr("width", window.innerWidth * 0.964)
        .attr("height", 40)
        .attr("class", "infoWindow");
    
    //create text
    var paragraph = infoWindow.append("text")
        .attr("x", 10)
        .attr("y", 25)
        .attr("class", "windowText")
        .text("This map depeicts the number of people who immigrated into Europe in 2015. The data includes the five countries that the most people emigrated from and which countries they moved to. Data from United Nations.");
};
    
//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
    
    //updates chart title
    /*var chartTitle = d3.select(".chartTitle")
        .text("People from " + expressed + " who immigrated to each country in 2015 (in thousands)");*/
};
    
//function to create a dropdown menu for attribute information
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });
    
    //add initial option
    var titleOption  = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Immigrant Country");
    
    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};
    
//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;
    
    //recreate the color scale
    var colorScale = makeColorScale(csvData);
    
    //recolor enumeration units
    var regions = d3.selectAll(".regions")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });
    
    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bars")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);
    
    updateChart(bars, csvData.length, colorScale);
};
    
function setGraticule(map, path){
    
    //create graticule generator
    var graticule = d3.geoGraticule()
            .step([10, 10]); //place graticule lines every 5 degrees lat and long
    
    //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assing class for styling
            .attr("d", path) //project graticule
        
    //create graticlue lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be covered
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assing class for styling
            .attr("d", path); //project graticule lines
    
};

function joinData(europeCountries, csvData){
    
    //loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<csvData.length; i++){
            var csvRegion = csvData[i]; //the current region
            console.log(csvRegion);
            var csvKey = csvRegion.CountryCode; //the csv primary key
            
            //loop through geojson regions to find correct region
            for (var a=0; a<europeCountries.length; a++){
                var geojsonProps = europeCountries[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.CC; //the geojson primary key
                
                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){
                    
                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvRegion[attr]); //get csv attribute values
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
    
    return europeCountries;
};

function setEnumerationUnits(europeCountries, map, path, colorScale){
    
    //add Europe countries to map
    var countries = map.selectAll(".regions")
        .data(europeCountries)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "regions " + d.properties.sovereignt;
        })
        .attr("d", path)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        })
        .on("mouseover", function(d){
            highlight(d.properties);
        })
        .on("mouseout", function(d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);

    //add style descriptor to each path
    var desc = countries.append("desc")
        .text('{"stroke": "#000", "stroke-width": "0.5px"}');
};
    
//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.sovereignt)
        .style("stroke", "white")
        .style("stroke-width", "2");
    
    //call the lable
    setLabel(props);
};
    
//function to reset element style on mouseout
function dehighlight(props){
    var selected = d3.selectAll("." + props.sovereignt)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });
    
    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();
        
        var styleObject = JSON.parse(styleText);
        
        return styleObject[styleName];
    };
    
    //remove info label
    d3.select(".infolabel")
        .remove();
};
    
//function to create dynamic label
function setLabel(props){
    //format numbers
    var format = d3.format(",");
    
    //label content
    var labelAttribute = "<p>" + format(props[expressed]*1000) + " People from" + "</p><b>" + expressed + "</b>";
    
    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.sovereign + "_label")
        .html(labelAttribute);
    
    var countryName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.name);
};
    
//function to move label
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;
    
    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;
    
    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1;
    
    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};
    
//function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#f1eef6",
        "#bdc8e1",
        "#74a9cf",
        "#2b8cbe",
        "#045a8d"
    ];
    
    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);
 
    //build array of all value of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };
    
    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);
    
    return colorScale;
};
    
//function to test for data value and return color
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};
})();