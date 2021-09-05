function matrixView(seletorName, data,options) {
	var width = document.querySelector(seletorName).getBoundingClientRect().width;
	var height = document.querySelector(seletorName).getBoundingClientRect().height;

	var x = d3
		.scaleBand()
		.domain([0, width - 120])
		.range([0, width - 120]);

	// Precompute the orders.
	var n = data.Nodes.length;
	var orders = {
		name: d3.range(n).sort(function (a, b) {
			return d3.ascending(data.Nodes[a].id, data.Nodes[b].id);
		}),
		count: d3.range(n).sort(function (a, b) {
			return data.Nodes[b].count - data.Nodes[a].count;
		}),
		group: d3.range(n).sort(function (a, b) {
			return d3.ascending(data.Nodes[a].id, data.Nodes[b].id);
		}),
	};

	if (options.order == 'name') {
		x.domain(orders['name']);
	} else if (options.order == 'count') {
		x.domain(orders['count']);
	} else if (options.order == 'group') {
		x.domain(orders['group']);
	}

	//var sequentialScale = d3.scaleSequential().domain([0, maxedge]).interpolator(d3.interpolateRainbow);
	d3.select(seletorName).select('svg').remove();

	var svg = d3
		.select(seletorName)
		.append('svg')
		.attr('width', width)
		.attr('height', height)
		.attr('class', 'matrix')
		.append('g')
		.attr('transform', 'translate(' + 80 + ',' + 80 + ')');

	var row = svg
		.selectAll('.row')
		.data(data.Matrix)
		.enter()
		.append('g')
		.attr('class', 'row')
		.attr('fill', '#e8e8e8')
		.attr('transform', function (d, i) {
			return 'translate(0,' + x(i) + ')';
		})
		.each(row);

	row.append('line').attr('x2', width - 120);

	row.append('text')
		.attr('class', 'node-label')
		.attr('id', (d, i) => i)
		.attr('x', -6)
		.attr('y', x.bandwidth() / 2)
		.attr('stroke', 'black')
		.attr('font-size', (d) => getNodeFontSize(d))
		.attr('text-anchor', 'end')
		.text(function (d, i) {
			return data.Nodes[i].name;
		})
		.on('dblclick', dbClickedNode);

	var column = svg
		.selectAll('.column')
		.data(data.Matrix)
		.enter()
		.append('g')
		.attr('class', 'column')
		.attr('transform', function (d, i) {
			return 'translate(' + x(i) + ')rotate(-90)';
		});

	column.append('line').attr('x1', -width + 120);

	column
		.append('text')
		.attr('class', 'node-label')
		.attr('id', (d, i) => i)
		.attr('x', 6)
		.attr('y', x.bandwidth() / 2)
		.attr('stroke', 'black')
		.attr('text-anchor', 'start')
		.attr('font-size', (d) => getNodeFontSize(d))
		.text(function (d, i) {
			return data.Nodes[i].name;
		})
		.on('dblclick', dbClickedNode);

	function row(row) {
		var cell = d3
			.select(this)
			.selectAll('.cell')
			.data(row)
			.enter()
			.append('rect')
			.attr('class', 'cell')
			.attr('x', function (d) {
				return x(d.x);
			})
			.attr('width', x.bandwidth())
			.attr('height', x.bandwidth())
			.style('fill', function (d) {
				return linecolor(d.z); //
			})
			.on('mouseover', mouseover)
			.on('mouseout', mouseout)
			.on('dblclick', dbClickedLink);

		d3.select(this)
			.selectAll('.link-label')
			.data(row)
			.enter()
			.append('svg:text')
			.attr('id', (d, i) => d.y + '-' + d.x)
			.attr('class', 'link-label')
			.style('visibility', () => {
				return options.linkLabel == 'on' ? 'visible' : 'hidden';
			})
			.attr('x', function (d, i) {
				return x(d.x) + x.bandwidth() * 0.4;
			})
			.attr('y', function (d, i) {
				return x.bandwidth() * 0.45;
			})
			.attr('font-size', x.bandwidth() * 0.1)
			.attr('stroke', 'black')
			.attr('fill', 'black')
			.text(function (d) {
				return d.z;
			});
	}

	function getNodeFontSize(d) {
		var size = x.bandwidth() * 0.1 
		return size > 10 ? size : 10
	}
	function mouseover(d, i) {
		var rect = this.getBoundingClientRect();
		d3.select('.tip')
			.style('display', 'block')
			.style('left', rect.x + 'px')
			.style('top', rect.y + 'px')
			.html(data.Nodes[d.y].name + ', ' + data.Nodes[d.x].name + '<br><strong>' + data.Edges[d.y][d.x] + '</strong>');

		d3.selectAll('.row .node-label').classed('active', function (o, i) {
			return i == d.y;
		});
		d3.selectAll('.column text').classed('active', function (o, i) {
			return i == d.x;
		});

		d3.selectAll('.cell').attr('opacity', 0.2);
		d3.select(this).attr('opacity', 1).attr('stroke-width', 1).attr('stroke', '#ccc');
	}

	function mouseout() {
		d3.select('.tip').style('display', 'none');
		d3.selectAll('.cell').attr('opacity', 1).attr('stroke-width', null).attr('stroke', null);
		d3.selectAll('text').classed('active', false);
	}

	function dbClickedNode(d, i) {
		if (d3.event.defaultPrevented) return; // dragged
		var _self = this;
		var bbox = _self.getBBox();
		$('.node-form').dialog({
			width: 250,
			title: data.Nodes[i].name,
			position: {
				my: "left+" + ( bbox.width + 8 >> 0 ) + " top",
				at: "left top-" + ( bbox.height / 2 >> 0 ),
				of: _self,
				collision: "flipfit",
			},
			buttons: [
				{
					text: 'Modify',
					addClass: 'btn-blue',
					click: function() {
						var $content = $(this).dialog('close');
						data.Nodes[i].name = $content.find('#name').val();
						data.Nodes[i].tau = $content.find('#tau').val();
						data.Nodes[i].h = $content.find('#H').val();
						// bind to events
						d3.select(_self).text(data.Nodes[i].name);
					}
				},
				{
					text: 'Cancel',
					click: function() {
						$(this).dialog('close');
					}
				}
			],
			open: function ( ev ) {
				var $content = $( this );
				$content.find('#name').val(data.Nodes[i].name);
				$content.find('#tau').val(data.Nodes[i].tau);
				$content.find('#H').val(data.Nodes[i].H);
			}
		});
	}

	function dbClickedLink(d, i) {
		if (d3.event.defaultPrevented) return; // dragged
		var _self = this;
		var i = d.y;
		var j = d.x;
		var bbox = _self.getBBox();
		console.log(window.event)
		$('.link-form').dialog({
			title: function(){
				$(this).parent().hide();
			},
			width: 200,
			minHeight: 0,
			position: {
				my: "left+" + ( bbox.width + 8 >> 0 ) + " top",
				at: "left top",
				of: _self,
				collision: "flipfit",
			},
			buttons: [
				{
					text: 'Modify',
					addClass: 'btn-blue',
					click: function() {
						var $content = $(this).dialog('close');
						data.Edges[i][j] = $content.find('#z').val();
						d3.select(_self).style('fill', linecolor(data.Edges[i][j]));
						d3.select(document.getElementById(i + '-' + j)).text(data.Edges[i][j]);
					}
				},
				{
					text: 'Cancel',
					click: function() {
						$(this).dialog('close');
					}
				}
			],
			open: function ( ev ) {
				var $content = $( this );
				$content.find('#z').val(data.Edges[i][j]);
			}
		})
		.keyup(function (e) {
			if (e.key == 'Enter') {
				$(this).parent().find('button:nth-child(1)').trigger('click');
			}
		});
	}
}
