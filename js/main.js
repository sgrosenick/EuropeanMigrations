//wrap everthing in a self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var attrArray = ["Russian Federation", "Ukraine", "Kazakhstan", "Poland", "Romania"]; //list of attributes
var expressed = attrArray[0]; //initial attribute

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = 960,
        height = 460;
    
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
    
    
    //use queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/EuropeMigrantData2015.csv") //load attributes from csv
        .defer(d3.json, "data/EuropeCountries.topojson") //load choropleth data
        .defer(d3.json, "data/WorldCountries.topojson") //load background data
        .await(callback);
    
    function callback(error, csvData, europe, worldCountries){
        
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
        
        //translate europe TopoJSON
        var europeCountries = topojson.feature(europe, europe.objects.EuropeCountries).features,
            worldBorders = topojson.feature(worldCountries, worldCountries.objects.WorldCountries);
        
        //variables for data join
        var attrArray = ["Russian Federation", "Ukraine", "Kazakhstan", "Poland", "Romania"];
        
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
        
        //add world countries
        var backgroundCountries = map.append("path")
            .datum(worldBorders)
            .attr("class", "countries")
            .attr("d", path);
        
        //add Europe countries to map
        var countries = map.selectAll(".regions")
            .data(europeCountries)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "regions " + d.properties.sovereignt;
            })
            .attr("d", path);
        
        
        //examine the results
        console.log(europeCountries);
    };
};
})();