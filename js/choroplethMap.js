class ChoroplethMap {

  constructor(_config, _data) {
    const attrLabels = {
      gdi:   "Gender Development Index",
      gdp:   "GDP per Capita",
      Urban: "Urban Population %",
      Rural: "Rural Population %",
      pop:   "Population"
    };

    this.config = {
      parentElement:    _config.parentElement,
      selectedYear:     _config.selectedYear || 2023,
      attr:             _config.attr || "gdi",
      containerWidth:   _config.containerWidth  || 1080,
      containerHeight:  _config.containerHeight || 510,
      margin:           _config.margin || { top: 0, right: 0, bottom: 0, left: 0 },
      tooltipPadding:   10,
      legendBottom:     50,
      legendLeft:       50,
      legendRectHeight: 12,
      legendRectWidth:  150,
      attrLabel:        attrLabels[_config.attr] || "Gender Development Index"
    };

    this.data = _data;
    this.initVis();
  }

  initVis() {
    let vis = this;

    vis.width  = vis.config.containerWidth  - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top  - vis.config.margin.bottom;

    vis.svg = d3.select(vis.config.parentElement).append('svg')
      .attr('width',  vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    vis.chart = vis.svg.append('g')
      .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    vis.projection = d3.geoMercator();
    vis.geoPath    = d3.geoPath().projection(vis.projection);

    vis.linearGradient = vis.svg.append('defs').append('linearGradient')
      .attr('id', 'legend-gradient');

    vis.legend = vis.chart.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${vis.config.legendLeft},${vis.height - vis.config.legendBottom})`);

    vis.legendRect = vis.legend.append('rect')
      .attr('width',  vis.config.legendRectWidth)
      .attr('height', vis.config.legendRectHeight);

    vis.legendTitle = vis.legend.append('text')
      .attr('class', 'legend-title')
      .attr('dy', '.35em')
      .attr('y', -10)
      .text(vis.config.attrLabel);

    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    const attr = vis.config.attr;
    const extent = d3.extent(vis.data.features, d => d.properties.mapValue);

    // use log scale for gdp and pop, linear for everything else
    if (attr === "gdp" || attr === "pop") {
      vis.colorScale = d3.scaleSequentialLog()
        .domain(extent)
        .interpolator(d3.interpolateReds);
    } else {
      vis.colorScale = d3.scaleLinear()
        .domain(extent)
        .range(['#f1eced', '#f06277'])
        .interpolate(d3.interpolateHcl);
    }

    window._choroplethColorScale = vis.colorScale;
    vis.legendTitle.text(`${vis.config.attrLabel} (${vis.config.selectedYear})`);

    vis.legendStops = [
      { color: vis.colorScale(extent[0]), value: extent[0], offset: 0   },
      { color: vis.colorScale(extent[1]), value: extent[1], offset: 100 },
    ];

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    vis.projection.fitSize([vis.width, vis.height], vis.data);

    const countryPath = vis.chart.selectAll('.country')
      .data(vis.data.features)
      .join('path')
      .attr('class', 'country')
      .attr('d', vis.geoPath)
      .attr('fill', d => d.properties.mapValue != null
        ? vis.colorScale(d.properties.mapValue)
        : '#e0e0e0'
      );

    countryPath
      .on('mousemove', (event, d) => {
        const val = d.properties.mapValue != null
          ? `<strong>${d.properties.mapValue.toFixed(3)}</strong> ${vis.config.attrLabel}`
          : 'No data available';
        d3.select('#tooltip')
          .style('display', 'block')
          .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
          .style('top',  (event.pageY + vis.config.tooltipPadding) + 'px')
          .html(`
            <div class="tooltip-title">${d.properties.name}</div>
            <div>${val}</div>
          `);
      })
      .on('mouseleave', () => {
        d3.select('#tooltip').style('display', 'none');
      });

    vis.legend.selectAll('.legend-label')
      .data(vis.legendStops)
      .join('text')
      .attr('class', 'legend-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('y', 20)
      .attr('x', (d, i) => i === 0 ? 0 : vis.config.legendRectWidth)
      .text(d => d.value != null ? d.value.toFixed(2) : '');

    vis.linearGradient.selectAll('stop')
      .data(vis.legendStops)
      .join('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);

    vis.legendRect.attr('fill', 'url(#legend-gradient)');
  }
}