
angular.module('costars.home' , [])

//THE CONTROLLER FOR THE ENTIRE COSTARS WEBSITE

.controller('HomeController', function($scope, $location, $http, ApiCalls, DB) {
  $scope.movies = []; //the movies we're currently displaying
  $scope.currentSearches = []; //array of actor objects, stored as {name: String, id: Number, profile_path: String, popularity: Number}
  $scope.actorIds = []; //it will be a list of ids

  //getMovies is called every time an actor is removed or added to the list
  $scope.getMovies = function (){
    if(!$scope.currentSearches.length){
      $scope.movies = []; //Empty the movie list
      $scope.actorIds = []; //Shouldn't be necessary (should already be removed), just a precaution
      return; 
    }
    if($scope.currentSearches.length === 1){
      //api call for one persons stuff
      console.log("In getMovies, length is one, about to make DB call")
      return DB.getActor($scope.currentSearches[0].name)
      .then(function(data){
        console.log('1 actor only data', data);
        $scope.movies = data.known_for; //set it to the well known movies
      })
      .catch(function(){
        //wasn't in the data base so do an api call, this probably means there's a DB error
        console.log("In getMovies, length is one, DB call failed, make API call");
        ApiCalls.searchByPerson($scope.currentSearches[0].name)
        .then(function(data){
          //posts retrieved info to the database
          $scope.storeActorDb(data.results[0]);
          $scope.movies = data.results[0].known_for;
          })
          .catch(function(err){
            console.log("Error making SBP call: ", err);
          }) 
      })
    }
    else{ //list contains multiple actors, we need to make a "discover" call
      return ApiCalls.discover($scope.actorIds)
        .then(function(movies) {
          console.log("Movies from discover call: ", movies);
          $scope.movies = movies;
        })
        .catch(function(error) {
          console.log("couldn't search multiple actors: ", error);
        });
    }
  };

  /*
  * Shows the movie overview, called when the mouse enters the movie display
  */
  $scope.showOverview = function(movie){
    movie.showOverview = true;
  }
  /*
  * Hides the movie overview, called when the mouse leaves the movie display
  */
  $scope.hideOverview = function(movie){
    movie.showOverview = false;
  }

  /*
  * Posts information to our database
  * @param data should be an object, formatted the same as the "results" returned from a SBP API call
  */
  $scope.storeActorDb = function(data){
    return DB.storeActor(data)
      .then(function(resp){
        console.log("actor stored",resp);
      })
      .catch(function(error){
        console.log("actor not stored:",error);
      });
  };

  /*
  * Function called whenever a user clicks the "add actor" button
  * Formats the input, then searches the database, then makes an API call if necessary
  * After DB call or API call is successful, the actor's information is stored to the in-memory variables
  * Calls $scope.getMovies to refresh the movie list after completion
  * @param actorInput - The input from the text box, as a string (should be an actor's name)
  */

  $scope.addActorInput = function (actorInput){
    actorInput = actorInput.trim();
    actorInput = actorInput.replace(/\s+/g, ' '); //trim down whitespace to single spaces, in case of typos
    actorInput = actorInput.split(' ').map(function(actorName){
      actorName = actorName.toLowerCase();
      return actorName.charAt(0).toUpperCase() + actorName.slice(1); //Capitalize first letter
    }).join(' '); //format all names the same    

    DB.getActor(actorInput)
    .then(function(actorData){
      $scope.actorIds.push(actorData.id); //add the id to our list
      for(var i = 0; i < $scope.currentSearches.length; i++){
        if($scope.currentSearches[i].name === actorData.name){ //already searching for this actor
          alert(actorData.name + " is already in the list")
          return;
        }
      }
      $scope.currentSearches.push({
        name: actorData.name,
        id: actorData.id,
        profile_path: actorData.profile_path,
        popularity: actorData.popularity
      }) //add the actor to our current searches
    })
    .catch(function(err){ //not found in DB
      console.log("Didn't find " + actorInput + " in database, making API call");
      ApiCalls.searchByPerson(actorInput)
      .then(function(actorData){
        if(!actorData.results.length){ //not found
          alert(actorInput + " not found!") //TODO: make a better way to display this error
          //no need to getMovies here, list shouldn't have changed
        }else{
          $scope.actorIds.push(actorData.results[0].id); //add the id to our list
          for(var i = 0; i < $scope.currentSearches.length; i++){
            if($scope.currentSearches[i].name === actorData.results[0].name){ //already searching for this actor
              alert(actorData.results[0].name + " is already in the list")
              return;
            }
          }
          $scope.currentSearches.push({
            name: actorData.results[0].name,
            id: actorData.results[0].id,
            profile_path: actorData.results[0].profile_path,
            popularity: actorData.results[0].popularity
          }) //store the actor name
          $scope.storeActorDb(actorData.results[0]) //store the data
          .then(function(resp){
            $scope.getMovies(); //get the movies for the current actor list
          })
          .catch(function(err){
            console.log("Error storing to database (in addActorInput): ", err);
            $scope.getMovies() //still want to retrieve movies
          })
        }
      })
      .catch(function(err){
        console.log("Error getting actor from tmDB: ", err);
      })
    }) 
  }

  /*
  * Removes an actor from our list and refreshes the movie list
  * @param actor an actor object, as stored in $scope.currentSearches
  */

  $scope.removeActorInput = function(actor){
    var index = $scope.currentSearches.indexOf(actor);
    if(index>=0){
      $scope.currentSearches.splice(index, 1);
      $scope.actorIds.splice(index, 1);
      $scope.getMovies();
    }else{
      console.log("removing actor input failed");
    }
  }
}) //END OF CONTROLLER