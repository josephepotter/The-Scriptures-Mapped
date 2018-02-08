/*
* Author: Joseph Potter
* Last Edited: 2/7/18
* Title: The Scriptures, Mapped.
*/
"use strict";
//I'm declaring this function at the global level so that it can be accessed by the elements on the page that call it.
function showLocation(geotagId, placename, latitude, longitude, viewLatitude, viewLongitude, viewTilt, viewRoll, viewAltitude, viewHeading){
  let location = {lat: latitude, lng: longitude};
  map.panTo(location);
  let zoom = Math.floor(14-(viewAltitude/2500));
  if (zoom < 8){
    //At least one link has a very high altitude (>1000000).
    //This moves such links to reasonable levels.
    zoom = 8;
  }
  map.setZoom(zoom);
}

const Scriptures = (function (){
  //function global variables###################################################
  let books = [];
  let volumes = [];
  let markers = [];
  let labels = [];
  //private function declarations###############################################
  let addMarker;
  let setPosition;
  let deleteMarkers;
  let ajax;
  let cacheBooks;
  let navigateHome;
  let showVolume;
  let showBook;
  let showChapter;
  let getNextLast;
  let getBreadCrumb;
  //public function declarations################################################
  let init;
  let onHashChanged;
  //public functions############################################################
  addMarker = function(locationInfo) {
    const lat = locationInfo.location.lat;
    const lng = locationInfo.location.lng;
    const name = locationInfo.name;
    const location = {lat,lng};
    //the labels require a funciton version of location
    const flocation = {
      lat: function(){return lat;},
      lng: function(){return lng;}
    };
    let add = true;
    labels.forEach(function(label){
        if (label.text === name){
          //if the label is already there, don't add it again
          add = false;
        }
      }
    );
    if (add){
      let marker = new google.maps.Marker({
        position: location,
        map
      });
      let label = new MapLabel({
        map,
        text: name,
        position:flocation
      });
      labels.push(label);
      markers.push(marker);
    }
  };
  setPosition = function(alt){
    if (markers.length > 1){
        //I believe this code was adapted from stackoveflow
        let bounds = new google.maps.LatLngBounds();
        markers.forEach(function(marker){
            bounds.extend(marker.getPosition());
          }
        );
        //zoom to show all labels
        map.fitBounds(bounds);
      }
    else if (markers.length === 1){
      map.panTo(markers[0].position);
      map.setZoom(Math.floor(14-(alt/2500)));
    }
  };
  deleteMarkers = function(){
    markers.forEach(function(marker){
        marker.setMap(null);
      }
    );
    //once all markers are set to null, empty the list.
    markers = [];
    labels.forEach(function(label){
        label.setMap(null);
      }
    );
    labels = [];
  };
  ajax = function(url, successCallback, failureCallback, isStr){
    let request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        let data;
        if(isStr){
          data = request.responseText;
        }
        else{
          data = JSON.parse(request.responseText);
        }
        if (typeof successCallback === "function"){
          successCallback(data);
        }
      }
      else {
        // We reached our target server, but it returned an error
        if (typeof failureCallback === "function"){
          failureCallback(request);
        }
      }
    };
    request.onerror = failureCallback;
    request.send();
  };
  cacheBooks = function(callback){
    volumes.forEach(function(volume){
      let volumebooks =[];
      let bookId = volume.minBookId;
      while (bookId <= volume.maxBookId){
        volumebooks.push(books[bookId]);
        bookId += 1;
      }
      volume.books = volumebooks;
    });
    if (typeof callback === "function"){
      callback();
    }
  };
  navigateHome = function(){
    let html = "";
    volumes.forEach(function(item) {
      html = html + "<div><a class = \"nav_button\" href =\"#" + item.id + "\">"+ item.backName + "</a></div>\n";
    });
    document.getElementById("nav_text").innerHTML = html;
    document.getElementById("next").innerHTML = "";
  };
  showVolume = function(volume){
    let html = "";
    volume.books.forEach(function(book){
      if (book.numChapters === 0){
        html = html + "<div><a class = \"nav_button\" href =\"#" + volume.id + ":" + book.id + ":0\">"+ book.backName + "</a></div>\n";
      }
      else{
        html = html + "<div><a class = \"nav_button\" href =\"#" + volume.id + ":" + book.id + "\">"+ book.backName + "</a></div>\n";
      }
    });
    document.getElementById("nav_text").innerHTML = html;
    document.getElementById("next").innerHTML = "";
  };
  showBook = function(vid, book){
    let html = "";
    let i = 1;
    while(i <= book.numChapters){
      html = html + "<div><a class = \"nav_button\" href =\"#" + vid + ":" + book.id + ":" + i + "\">"+ "Chapter "  + i + "</a></div>\n";
      i+=1;
    }
    document.getElementById("nav_text").innerHTML = html;
    document.getElementById("next").innerHTML = "";
  };
  showChapter = function(vid,bid,cid){
    deleteMarkers();
    let nextLast = getNextLast(vid, bid, cid);
    let html = "";
    if (nextLast.last.length === 3){
      html = html + "<a  class = \"left button\" href =\"#" + nextLast.last[0] + ":" + nextLast.last[1] + ":" + nextLast.last[2] + "\">last chapter</a>";
    }
    if (nextLast.next.length === 3){
      html = html + "<a class = \"right button\" href =\"#" + nextLast.next[0] + ":" + nextLast.next[1] + ":" + nextLast.next[2] + "\">next chapter</a>";
    }
    html = html + "<div style=\"clear: both;\"></div><br>";
    document.getElementById("next").innerHTML = html;
    let url = "http://scriptures.byu.edu/mapscrip/mapgetscrip.php?book=" + bid + "&chap=" + cid;
    ajax(url,
      function(data){
        document.getElementById("nav_text").innerHTML = data;
        let text = document.getElementById("nav_text");
        let links = text.getElementsByTagName("a");
        let alt = 0;
        let i = 0;
        while(i< links.length){
          let call = links.item(i).getAttribute("onclick");
          if (call.substr(0,12) === "showLocation"){
            let json = call.substring(12).replace("(","[").replace(")","]").split("'").join("\"");
            json = JSON.parse(json);
            let locationInfo = {
              name:json[1],
              location: {lat:json[2],lng:json[3]},
              alt:json[8]
            };
            alt = json[8];
            addMarker(locationInfo);
          }
          i+=1;
        }
        setPosition(alt);
      },null,true
    );
  };
  getNextLast = function(vid, bid, chapter){
    let volume = volumes[vid-1];
    let book = books[bid];
    let next = [];
    let last = [];
    if (chapter < book.numChapters){
      next = [volume.id,book.id,chapter + 1];
    }
    let newBookId = "";
    if(chapter === book.numChapters){
      if (book.id < volume.maxBookId){
        if (books[book.id + 1].numChapters === 0){
          next = [volume.id ,book.id + 1, 0];
        }
        else{
          next = [volume.id ,book.id + 1, 1];
        }
      }
      else if(book.id === volume.maxBookId && volume.id !== volumes[volumes.length -1].id)
      {
        newBookId = volumes[volume.id].minBookId;
        if (books[newBookId].numChapters === 0){
          next = [volume.id + 1,newBookId, 0];
        }
        else{
          next = [volume.id + 1,newBookId, 1];
        }
      }
    }
    if (chapter > 1){
      last = [volume.id,book.id,chapter - 1];
    }
    else if (chapter <= 1){
      if(book.id > volume.minBookId){
        last = [volume.id,book.id - 1, books[book.id - 1].numChapters];
      }
      else if(book.id === volume.minBookId && volume.id !== volumes[0].id){
        newBookId = volumes[volume.id - 2].maxBookId;
        last = [volume.id - 1, newBookId, books[newBookId].numChapters];
      }
    }
    return{
      next,
      last
    };
  };
  getBreadCrumb = function(volumeId, bookId, chapter){
    let html = "<a href =\"#\">Home</a>";
    if (volumeId){
      html = html + " / <a href = \"#" + volumeId.toString() + "\">" + volumes[volumeId-1].backName + "</a>";
    }
    if (bookId){
      html = html + " / <a href = \"#" + volumeId.toString() + ":" + bookId.toString() + "\">" + books[bookId].backName + "</a>";
    }
    if (chapter){
      html = html + " / <a href = \"#" + volumeId.toString() + ":" + bookId.toString() + ":" + chapter.toString() + "\">Chapter " + chapter + "</a>";
    }
    html += "<br>";
    document.getElementById("breadCrumb").innerHTML = html;
  };
  //public funcitons############################################################
  init = function(callback){
    let booksLoaded = false;
    let volumesLoaded = false;
    ajax("http://scriptures.byu.edu/mapscrip/model/books.php",
      function(data){
        books = data;
        booksLoaded = true;
        if (volumesLoaded){
          cacheBooks(callback);
        }
      }
    );
    ajax("http://scriptures.byu.edu/mapscrip/model/volumes.php",
      function(data){
        volumes = data;
        volumesLoaded = true;
        if (booksLoaded){
          cacheBooks(callback);
        }
      }
    );
  };
  onHashChanged = function(){
    let ids = [];
    if (window.location.hash !== "" && window.location.hash.length > 1){
      ids = location.hash.substring(1).split(":");
    }
    if (ids.length <= 0 ){
      navigateHome();
      getBreadCrumb();
    }
    else if (ids.length > 0){
      let volumeId = parseInt(ids[0]);
      let bookId = parseInt(ids[1]);
      let chapter = parseInt(ids[2]);
      let volume = {};
      let book = {};
      if (volumeId){
        volume = volumes[ids[0] - 1];
      }
      if (bookId){
        book = books[ids[1]];
      }

      if (volumeId < volumes[0].id || volumeId > volumes[volumes.length -1]){
        navigateHome();
        getBreadCrumb();
      }
      else if (ids.length === 1){
        showVolume(volume);
        getBreadCrumb(volume.id);
      }
      else if (bookId < volume.minBookId || bookId > volume.maxBookId){
        navigateHome();
        getBreadCrumb();
      }
      else if(ids.length === 2){
        showBook(volumeId,book);
        getBreadCrumb(volumeId,book.id);
      }
      else if(ids[2] < 0 || ids[2] > book.numChapters){
        navigateHome();
        getBreadCrumb();
      }
      else{
        showChapter(volumeId, bookId, chapter);
        getBreadCrumb(volumeId, bookId, chapter);
      }
    }
  };
  //API#########################################################################
  return {
    init,
    onHashChanged
  };
}());
