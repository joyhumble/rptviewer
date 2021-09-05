function edgeBundleView(seletorName, data,options) {
	var width = document.querySelector(seletorName).getBoundingClientRect().width;
	var height = document.querySelector(seletorName).getBoundingClientRect().height;

	d3.select(seletorName).select('svg').remove();

	var svg = d3
		.select(seletorName)
		.append('svg')
		.attr('width', width)
		.attr('height', height)
		.attr('class', 'egdeBundle')
		.attr('viewBox', [-width / 2, -height / 2, width, height]);

	// simulation setup with all forces
	var radius = width / 2;

	var children = graph();
	var tree = d3.cluster().size([2 * Math.PI, radius - 100]);
	var root = tree(bilink(d3.hierarchy(children).sort((a, b) => d3.ascending(a.height, b.height) || d3.ascending(a.data.id, b.data.id))));

	// build marker the arrow.
	var defs = svg.append('defs');
	defs.append('marker') // This section adds in the arrows
		.attr('id', 'arrow')
		.attr('viewBox', '0 0 12 12')
		.attr('refX', 6)
		.attr('refY', 6)
		.attr('markerWidth', 12)
		.attr('markerHeight', 12)
		.attr('orient', 'auto')
		.append('path')
		.attr('fill', 'gray')
		.attr('d', 'M2,2 L10,6 L2,10 L6,6 L2,2');

	var nodeTextElements = svg
		.append('g')

		.selectAll('g')
		.data(root.leaves())
		.join('g')
		.attr('transform', (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`)
		.append('text')
		.attr('class', 'node-label')
		.attr('dy', '0.31em')
		.attr('x', (d) => (d.x < Math.PI ? 6 : -6))
		.attr('text-anchor', (d) => (d.x < Math.PI ? 'start' : 'end'))
		.attr('transform', (d) => (d.x >= Math.PI ? 'rotate(180)' : null))
		.text((d) => d.data.name)
		.each(function (d) {
			d.nodeLabel = this;
		})
		.on('dblclick', dbClickedNode)
		.on('mouseover', mouseover)
		.on('mouseout', mouseout);

	var line = d3
		.lineRadial()
		.curve(d3.curveBundle.beta(options.curveBundle))
		.radius((d) => d.y)
		.angle((d) => d.x);

	var linkdata = root.leaves().flatMap((leaf) => leaf.outgoing);

	var linkElements = svg
		.append('g')
		.attr('class', 'links')
		.attr('stroke', '#ccc')
		.attr('fill', 'none')
		.selectAll('path')
		.data(linkdata)
		.enter()
		.append('svg:path')
		.attr('class', 'link')
		.attr('id', function (d) {
			return d[0].data.id + '-' + d[1].data.id;
		})
		.attr('d', ([i, o]) => line(i.path(o)))
		.attr('stroke', function (d, i) {
			//console.log('linecolor [' + d[0].data.id + ',' + d[1].data.id + '] = ' + data.Edges[d[0].data.id][d[1].data.id]);
			return linecolor(data.Edges[d[0].data.id][d[1].data.id]);
		})
		.style('mix-blend-mode', 'multiply')
		.attr('marker-end', 'url(#arrow)')
		.each(function (d) {
			d.link = this;
		});

	var linkLabelElements = svg
		.append('g')
		.attr('class', 'link-labels')
		.attr('fill', 'black')
		.style('visibility', 'hidden')
		.selectAll('.link-label')
		.data(linkdata)
		.enter()
		.append('svg:text')
		.attr('text-anchor', 'middle')
		.attr('class', 'link-label')
		.append('svg:textPath')
		.attr('font-size', 10)
		.attr('startOffset', '35%')
		.attr('xlink:href', function (d) {
			return '#' + d[0].data.id + '-' + d[1].data.id;
		})
		.text(function (d) {
			return data.Edges[d[0].data.id][d[1].data.id];
		})
		.each(function (d) {
			d.linkLabel = this;
		})
		.on('dblclick', dbClickedLink);

	if (options.linkLabel == 'on') {
		d3.select('.link-labels').style('visibility', 'visible');
	}

	function mouseover(d) {
		nodeTextElements.attr('opacity', 0.1);
		linkLabelElements.attr('opacity', 0.1);
		linkElements.attr('opacity', 0.1).style('mix-blend-mode', 'multiply');
		d3.select(this).attr('opacity', 1).attr('font-weight', 'bold');
		d3.selectAll(d.incoming.map((d) => d.link)).attr('opacity', 1);
		d3.selectAll(d.outgoing.map((d) => d.link)).attr('opacity', 1);
		d3.selectAll(d.incoming.map((d) => d.linkLabel)).attr('opacity', 1);
		d3.selectAll(d.outgoing.map((d) => d.linkLabel)).attr('opacity', 1);
		d3.selectAll(d.incoming.map(([d]) => d.nodeLabel))
			.attr('opacity', 1)
			.attr('font-weight', 'bold');
		d3.selectAll(d.outgoing.map(([, d]) => d.nodeLabel))
			.attr('opacity', 1)
			.attr('font-weight', 'bold');
	}

	function mouseout(d) {
		linkLabelElements.attr('opacity', 1);
		nodeTextElements.attr('opacity', 1);
		linkElements.attr('opacity', 1).style('mix-blend-mode', 'multiply');
		d3.select(this).attr('font-weight', null);
		d3.selectAll(d.incoming.map(([d]) => d.nodeLabel)).attr('font-weight', null);
		d3.selectAll(d.outgoing.map(([, d]) => d.nodeLabel)).attr('font-weight', null);
	}

	function graph() {
		var nodes = data.Nodes;
		var links = data.Links;
		var groupById = new Map();
		var nodeById = new Map(nodes.map((node) => [node.id, node]));

		for (var node of nodes) {
			var group = groupById.get(node.H);
			if (!group) groupById.set(node.H, (group = { id: node.H, children: [] }));
			group.children.push(node);
			node.targets = [];
		}

		for (var { source: sourceId, target: targetId } of links) {
			nodeById.get(sourceId).targets.push(targetId);
		}

		return { children: [...groupById.values()] };
	}

	function bilink(root) {
		var map = new Map(root.leaves().map((d) => [d.data.id, d]));
		for (var d of root.leaves()) {
			d.incoming = [];
			d.outgoing = d.data.targets.map((i) => [d, map.get(i)]);
		}
		for (var d of root.leaves()) {
			for (var o of d.outgoing) {
				o[1].incoming.push(o);
			}
		}
		return root;
	}

	function dbClickedNode(d) {
		if (d3.event.defaultPrevented) return;
		var _self = this;
		var bbox = _self.getBBox();
		$('.node-form').dialog({
			width: 250,
			title: data.Nodes[d.data.id].name,
			position: {
				my: 'left+' + ((bbox.width + 8) >> 0) + ' top',
				at: 'left top-' + ((bbox.height / 2) >> 0),
				of: _self,
				collision: 'flipfit',
			},
			buttons: [
				{
					text: 'Modify',
					addClass: 'btn-blue',
					click: function () {
						var $content = $(this).dialog('close');
						data.Nodes[d.data.id].name = $content.find('#name').val();
						data.Nodes[d.data.id].tau = $content.find('#tau').val();
						data.Nodes[d.data.id].h = $content.find('#H').val();
						// bind to events
						d3.select(_self).text(data.Nodes[d.data.id].name);
					},
				},
				{
					text: 'Cancel',
					click: function () {
						$(this).dialog('close');
					},
				},
			],
			open: function (ev) {
				var $content = $(this);
				$content.find('#name').val(data.Nodes[d.data.id].name);
				$content.find('#tau').val(data.Nodes[d.data.id].tau);
				$content.find('#H').val(data.Nodes[d.data.id].H);
			},
		});
	}

	function dbClickedLink(d) {
		if (d3.event.defaultPrevented) return;
		var _self = this;
		var i = d[0].data.id;
		var j = d[1].data.id;
		var bbox = _self.getBBox();
		$('.link-form')
			.dialog({
				width: 200,
				minHeight: 0,
				title: function () {
					$(this).parent().hide();
				},
				position: {
					my: 'left+' + ((bbox.width + 8) >> 0) + ' top',
					at: 'left top-' + ((bbox.height / 2) >> 0),
					of: _self,
					collision: 'flipfit',
				},
				buttons: [
					{
						text: 'Modify',
						addClass: 'btn-blue',
						click: function () {
							var $content = $(this).dialog('close');
							data.Edges[i][j] = $content.find('#z').val();
							d3.select(_self).text(data.Edges[i][j]);
							d3.select(document.getElementById(i + '-' + j)).attr('stroke', linecolor(data.Edges[i][j]));
						},
					},
					{
						text: 'Cancel',
						click: function () {
							$(this).dialog('close');
						},
					},
				],
				open: function (ev) {
					var $content = $(this);
					$content.find('#z').val(data.Edges[i][j]);
				},
			})
			.keyup(function (e) {
				if (e.key == 'Enter') {
					$(this).parent().find('button:nth-child(1)').trigger('click');
				}
			});
	}
}
