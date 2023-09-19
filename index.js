const urlList = {
	education: "https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/for_user_education.json",
	map: "https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/counties.json"
};

// Save all of the data into two arrays created globally:
let eduData = [];
let mapData = [];
// Set up a counter to keep track of how many datasets we've received:
let readyCount = 0;

// Now, let's make the data requests once the page has loaded:
document.addEventListener("DOMContentLoaded", function() {
	// Iterate through the urlList object and make an AJAX request each time, saving the received data to each of the arrays:
	for (const property in urlList) {
		let request = new XMLHttpRequest();
		request.open("GET", urlList[property], true);
		request.send();

		// When the request is succesful and the data from the server is received:
		request.onload = function() {
			if (property == "education") {				
				eduData = JSON.parse(request.responseText);
				readyCount += 1;
			}
			else if (property == "map") {
				mapData = JSON.parse(request.responseText);
				readyCount += 1;				
			}
			
			// Check that the amount of responses received matches the number of URL's we had before calling the function that builds the chart:
			if (readyCount === Object.keys(urlList).length) {
				buildChart();
			};
		};
	}

	const buildChart = function() {
		// With all of the data received and stored in the dataset arrays, let's set up all the variables for our choropleth chart:
		const paddingTop = 40;
		const paddingLeft = 20;
		const paddingRight = 60;
		const paddingBottom = 20;
		
		const w = 1000 + paddingLeft + paddingRight;
		const h = 600 + paddingTop + paddingBottom;
		
		const legendRectCount = 10;
		const legendRectH = (h - paddingTop - paddingBottom) / legendRectCount;
		const legendRectW = 10;
		const legendSpacing = 55;

		const minColor = "#dae6f2";
		const pivotColor = "#6db4f2";
		const maxColor = "#0081f2";
		const stateBorderColor = "orange";

		// Let's create and place the chart SVG:
		const svg = d3
			.select("#container")
			.append("svg")
			.attr("id", "chart")
			.attr("width", w)
			.attr("height", h)
		;

		// Give the chart a title and a description:
		svg
			.append("text")
			.text("Higher Education Rates by US county")
			.attr("id", "title")
			.attr("transform", "translate(" + w / 2 + ", " + paddingTop + ")")
			.attr("text-anchor", "middle")
		;
		svg
			.append("text")
			.text("Adults age ≥25 with a bachelor's degree or higher (2010-2014)")
			.attr("id", "description") // project requirement
			.attr("transform", "translate(" + w / 2 + ", " + 1.7 * paddingTop + ")")
			.attr("text-anchor", "middle")
		;
		
		const eduMin = d3.min(eduData, (d) => d.bachelorsOrHigher);
		const eduMean = d3.mean(eduData, (d) => d.bachelorsOrHigher);
		const eduMax = d3.max(eduData, (d) => d.bachelorsOrHigher)

		const colorScale = d3
			.scaleLinear()
			.domain([eduMin, eduMean, eduMax])
			.range([minColor, pivotColor, maxColor])
		;
		
		// Store the most recent eduData object in a variable. By default, set it to the first object in eduData as a place holder:
		let recentEduData = [eduData[0]]; 
		// Let's write the function that returns the correct eduData value for a given county:
		const fetchEduData = function(d, keyName) {
			// If the object in recentEduData doesn't match the ID of the county, then update recentEduData:
			if (recentEduData[0].fips != d.id) {
				recentEduData = eduData.filter( (val) => val.fips == d.id);
			}
			return recentEduData[0][keyName];
		};
		
		// Place the DIV that will hold our tooltip on the page:
		const toolTipBox = d3.select("#container")
			.append("div")
			.attr("id", "tooltip")
		;
		
		// Function that will automatically create the HTML content of our tooltips:
		const toolTipContent = function(d) {
			let currentCounty = eduData.filter( (val) => val.fips == d.id) [0];
			
			let area_name = currentCounty.area_name;
			let state = currentCounty.state;
			let fips = d.id;
			let eduLevel = currentCounty.bachelorsOrHigher;
			
			return area_name + ", " + state + "<br>" + eduLevel + "%";
		};
		
		
		// Let's create the legend. First, create and place a group that will hold all of our legend elements:
		const legend = svg
			.append("g")
			.attr("id", "legend")
			.attr("transform", "translate(" + (w - paddingLeft - paddingRight) + ", " + (h - paddingBottom) + ")");
		
		// Function that can dynamically create the limits for each of the steps:
		const legendData = function() {
			// Defining an array and prepopulating it with the lowest value...
			let arr = [eduMin]
			// ...determining how far apart each of the steps should be based on how many rectangles we want in our legend.
			let stepSize = (eduMax - eduMean) / legendRectCount;
			// With this info, populate the array with the values for each step -1...
			for (i = 1; i <= legendRectCount - 1; i ++) {
				arr.push( parseFloat( (i * stepSize + eduMin).toFixed(1) ) )
			};
			// ...and finally add the largest value to the array.
			arr.push(eduMax); 	
			return arr;
		};
		
		// Let's build the array. First, place the rectangles...
		legend.selectAll("rect")
			.data( legendData().slice(0, -1) ) // We remove the last rectangle so that we end on the eduMax value
			.enter()
				.append("rect")
				.attr("id", "legend-rect")
				.attr("y", (d, i) => i * ( -legendRectH) - legendRectH)
				.attr("width", legendRectW)
				.attr("height", legendRectH)
				.attr("fill", (d) => colorScale(d))
				.attr("stroke", "white")
		;
		// ...place the labels, inline with the edge of each rectangle in our legend:		
		legend
			.append("g")
			.attr("id", "legend-axis")
			.selectAll("text")
				.data( legendData() )
				.enter()
					.append("text")
					.attr("id", "legend-label" )
					.text( (d) => d + "%")
					.attr("y", (d, i) => i * (-legendRectH))
					.attr("transform", "translate(" + legendSpacing + ", 0)" );
		
		const geoPathMaker = d3.geoPath();
		// With our D3 path generator defined and ready to go, let's create a container for all of our counties using a group:
		const counties = svg
			.append("g")
			.attr("id", "counties")
			.attr("transform", "translate(" + paddingLeft + ", " + paddingTop + ")" );		
		// Also create a container group for the individual states:
		const states = svg
			.append("g")
			.attr("id", "states")
			.attr("transform", "translate(" + paddingLeft + ", " + paddingTop + ")" );
	
		// With our two map groups ready, load up the county data and have D3 place the elements within the counties group with the help of topoJSON and the path generator:
		counties
			.selectAll("path")
			.data( topojson.feature(mapData, mapData.objects.counties).features )
			.enter()
				.append("path")
				.attr("class", "county")
				.attr("d", geoPathMaker )
				.attr("data-fips", (d) => d.id )
				.attr("data-education", (d) => fetchEduData(d, "bachelorsOrHigher") )
				.attr("fill", (d) => colorScale( fetchEduData(d, "bachelorsOrHigher")))
				.on("mouseover", (d, i) => {
					toolTipBox
						.style("top", d3.event.pageY + 10 + "px" )
						.style("left", d3.event.pageX + 10 + "px" )
						.attr("data-education", fetchEduData(d, "bachelorsOrHigher"))
						.style("background", colorScale(fetchEduData(d, "bachelorsOrHigher")) )
						.style("visibility", "visible")
						.html( toolTipContent(d));
				})
				.on("mouseout", (d, i) => {
					toolTipBox					
						.style("visibility", "hidden")
					;
				})
		;
		// With the counties added, place the elements for the state borders in order to make it easier for the user to make sense of where all the counties (3000+) are:
		states
			.selectAll("path")
			.data( topojson.feature(mapData, mapData.objects.states).features )
			.enter()
				.append("path")
				.attr("class", "state")
				.attr("d", geoPathMaker)
				.attr("fill", "none")
				.attr("stroke", "orange");
	};
});
