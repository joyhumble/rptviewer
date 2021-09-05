function drawScale(seletorName, interpolator) {
	var width = document.querySelector(seletorName).getBoundingClientRect().width;
	var height = document.querySelector(seletorName).getBoundingClientRect().height || 16;
	d3.select(seletorName).select('svg').remove();
	var svg = d3.select(seletorName).append('svg').attr('width', width).attr('height', height);

	var domain = interpolator.domain();
	var range = interpolator.range();

	var stops = [
		{ offset: 0, color: range[0], value: domain[0] },
		{ offset: 0.5, color: range[1], value: domain[1] },
		{ offset: 1, color: range[2], value: domain[2] },
	];

	var legend_svg = svg
		.attr('width', width )
		.attr('height', height)
		.append('g')
		.attr('class', 'legend')

	var defs = legend_svg.append('defs');

	var gradient = defs.append('linearGradient').attr('id', 'linear-gradient');

	gradient
		.selectAll('stop')
		.data(stops)
		.enter()
		.append('stop')
		.attr('offset', function (d) {
			return 100 * d.offset + '%';
		})
		.attr('stop-color', function (d) {
			return d.color;
		});

	legend_svg.append('rect').attr('width', width).attr('height', height).style('fill', 'url(#linear-gradient)');

}
