var list = $("#list table tbody");
var modalServers = $("#modalServers");
var startjob_controls = $("#startjob_controls");
var startjob = $("#startjob");

list.on("click", ".startjob", function() {
  var id = $(this).attr("data-id");
  $.ajax({
    "method": "GET",
    "url": "/servers/"+id
  })
  .done(function(res) {
    var output = "";
    res['servers'].forEach(function(server) {
      output += '<div class="form-check">'
      output += '<input class="form-check-input" type="checkbox" checked="checked" value="'+server._id+'" id="server-'+server._id+'">';
      output += '<label class="form-check-label" for="server-'+server._id+'">'+server.name+' ('+server.count+')'+'</label>';
      output += '</div>';
    });
    startjob.val(id);
    modalServers.html(output);
    $("#startJobModal").modal({"show": true});
  })
  .fail(function(error) {
    alert(error.responseText);
  });
});

$("#invertovat").click(function() {
  modalServers.find("input[type='checkbox']").each(function(checkbox) {
    $(this).prop("checked", ! $(this).prop("checked"));
  });
});

list.on("click", ".smazat", function() {
  var id = $(this).attr("data-id");
  $.ajax({
    "method": "DELETE",
    "url": "/exports/"+id
  })
  .done(function(res) {
    updateList();
  })
  .fail(function(error) {
    alert(error.responseText);
  });
});

startjob_controls.on('change', "#customFilter", function() {
  $(this).val( decodeURIComponent($(this).val()) ); 
});

startjob_controls.on('click', '#newScrapePobocky', function() {
  var newScrapePobocky = $("#newScrapePobocky");
  var newScrapePartneri = $("#newScrapePartneri");
  var customFilter = $("#customFilter").val();
  newScrapePartneri.prop("disabled", true);
  newScrapePobocky.prop("disabled", true);
  $.ajax({
    "method": "POST",
    "url": "/scrapeExports/pobocky",
    "data": { "customFilter": customFilter}
  })
  .done(function(data) {
    progressbar();
    updateList();
    newScrapePartneri.prop("disabled", false);
    newScrapePobocky.prop("disabled", false);
  })
  .fail(function(error) {
    progressbar();
    alert(error.responseText);
    newScrapePartneri.prop("disabled", false);
    newScrapePobocky.prop("disabled", false);
  })
});

startjob_controls.on('click', '#newScrapePartneri', function() {
  var newScrapePobocky = $("#newScrapePobocky");
  var newScrapePartneri = $("#newScrapePartneri");
  var customFilter = $("#customFilter").val();
  newScrapePartneri.prop("disabled", true);
  newScrapePobocky.prop("disabled", true);
  $.ajax({
    "method": "POST",
    "url": "/scrapeExports/partneri",
    "data": { "customFilter": customFilter}
  })
  .done(function(data) {
    progressbar();
    newScrapePartneri.prop("disabled", false);
    newScrapePobocky.prop("disabled", false);
  })
  .fail(function(error) {
    progressbar();
    alert(error.responseText);
    newScrapePartneri.prop("disabled", false);
    newScrapePobocky.prop("disabled", false);
  })
});

function updateList() {
  $.ajax({
    "method": "GET",
    "url": "/exports"
  })
  .done(function(docs) {
    var output = "";
    docs.forEach(function(val) {
      output += '<tr>'
      output += '<td class="text-center" scope="row">'+val._id+'</td>';
      output += '<td>'+val.date+'</td>';
      output += '<td class="text-center">'+val.count+'</td>';
      output += '<td class="text-right"><button class="btn btn-primary btn-sm startjob" data-id="'+val._id+'">Akce</button> <button class="btn btn-danger btn-sm smazat" data-id="'+val._id+'">&times;</button></td>';
      output += '</tr>'
    });
    list.html(output);
  })
  .fail(function(error) {
    alert(JSON.stringify(error));
  });
}

function progressbar() {
  $.ajax({
    "method": "GET",
    "url": "/scrapeExports/lock"
  })
  .done(function(res) {
    console.log(res);
    var html;
    if(res.lock) {
      html = '<div class="progress"><div class="progress-bar" role="progressbar" style="width: '+res.progress+'%;">'+res.progress+' %</div></div>';
      progress.on();
    } else {
      html = '<div class="input-group"><input type="text" class="form-control" placeholder="Zadejte svůj libovolný filtr a zvolte druh přihlášení ..." id="customFilter"><div class="input-group-append" id="button-addon4"><button type="button" class="btn btn-primary" id="newScrapePobocky">Pobočky</button> <button type="button" class="btn btn-primary" id="newScrapePartneri">Partnery</button></div></div>';
      updateList();
      progress.off();
    }
    startjob_controls.html(html);
  })
  .fail(function(error) {
    alert(JSON.stringify(error));
  });
}

startjob.click(function() {
  if($("#export_action").val() == "none") {
    return alert("Vyber akci");
  }
  $("#startJobModal").modal('hide');
  var newScrapePobocky = $("#newScrapePobocky");
  var newScrapePartneri = $("#newScrapePartneri");
  var export_action = $("#export_action").val();
  newScrapePartneri.prop("disabled", true);
  newScrapePobocky.prop("disabled", true);
  var formData = [];
  $("#modalServers input[type='checkbox']:checked").each(function(i,e) {
    formData.push($(this).attr("value"));
  });
  $.ajax({
    "method": "POST",
    "url": "/startjob/"+startjob.val(),
    "data": {"servers": formData, "export_action": export_action}
  })
  .done(function(data) {
    progressbar();
    newScrapePartneri.prop("disabled", false);
    newScrapePobocky.prop("disabled", false);
  })
  .fail(function(error) {
    progressbar();
    alert(error.responseText);
    newScrapePartneri.prop("disabled", false);
    newScrapePobocky.prop("disabled", false);
  });
});

var progress = function() {}

progress.on = function() {
  if(this.running) return;
  this.interval = setInterval(progressbar, 2000);
  this.running = true;
}

progress.off = function() {
  clearInterval(this.interval);
  this.running = false;
}

progress();

progressbar();
