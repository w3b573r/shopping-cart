function Product(id, name, price) {
    // fields set from constructor
    this.id = String(id);
    this.name = String(name);
    this.price = Number(price);
    this.quantity = 0;
    
    // setters
    this.setQuantity = function(n) { this.quantity = n; };
    
    // getters
    this.getId = function() { return this.id; };
    this.getName = function() { return this.name; };
    this.getPrice = function() { return this.price; };
    this.getQuantity = function() { return this.quantity; };
    this.getExtendedPrice = function() { return this.quantity * this.price; };
    this.bumpQuantity = function() { this.quantity++; };
    
    // for testing only
    this.toString = function() {
        return this.id + "|" + this.name + "|" + this.price + "|" + this.quantity + "|" + this.getExtendedPrice();
    };
};

app.factory('productHandler', ['$http', '$log', function($http, $log) {
    var products = {};
    
    products.list = [];
    
    products.load = function() {
        $http({
            method: "GET",
            url: "/products.json"
        }).then(function(response) {
            for (var p = 0; p < response.data.length; p++) {
                products.list.push(new Product(response.data[p]['itemID'], 
                                               response.data[p]['itemname'], 
                                               response.data[p]['price']));
            }
        });
    }
    
    products.find = function(id) {
        id = id.toLowerCase();
        
        for (var s=0; s<products.list.length; s++) {
            if (id == products.list[s].getId().toLowerCase()) {
                return s;
            }
        }
        $log.error("Product ID '" + id + "' was not found!")
        return -1;
    }
    
    products.quantity = {
        bump: function(index) {
            products.list[index].bumpQuantity();
        },
        set: function(index, quantity) {
            products.list[index].setQuantity(quantity);
        },
        clear: function(index) {
            products.list[index].setQuantity(0);
        },
        get: function(index) {
            return products.list[index].getQuantity();
        }
        
    };
    
    products.getItem = function(id) {
        return products.list[id];
    }
    
    return products;
}]);

app.provider('cartProvider', function() {
    // Configuration
    this.cartURL = 'cart.html';
    this.homeURL = 'index.html';
    this.salesTaxRate = 0.06;
    this.freeShipping = false;
    this.shippingRate = 8.99;
    this.cartName = "cart";
    
    // Functions available to controllers
    this.$get = ['notifyService', 'productHandler', '$log', function(notifyService, productHandler, $log) {
        var cartPVDR = {
            load: function() {
                var cartFromStorage = localStorage[this.cartName].split("|");
                
                if (cartFromStorage != null && cartFromStorage.length != 0) {
                    for (var k=0; k < cartFromStorage.length; k++) {
                        var loadedIndex = productHandler.find(cartFromStorage[k]);
                        
                        if (loadedIndex > -1) {
                            productHandler.quantity.bump(loadedIndex);
                        }
                    }
                }
            },
            requestAdd: function(id) {
                id = productHandler.find(id);
                
                if (id > -1) {
                    if (productHandler.quantity.get(id) == 0) {
                        notifyService.alert("The item '" + productHandler.list[id].getName() + "' has been added to your cart.");
                        this.add(id);
                    } else {
                        notifyService.confirm("The item '" + productHandler.list[id].getName() + "' is already " +
                                              "in your cart. Are you sure you want to add another?", "Ad",
                                              "Yes", "No").then(function(userInput) {
                            if (userInput) {
                                cartPVDR.add(id);
                            }
                        });
                    }
                } else {
                    notifyService.alert("Whoops! This site has encountered an error. Don't worry: it's not your fault. " +
                                        "The developer of this site has made an error when programming item IDs.", "Error");
                }
            },
            add: function(id) {
                productHandler.quantity.bump(id);
                this.write();
            },
            clear: function() {
                localStorage.removeItem(this.cartName);
                window.location.reload();
            },
            toString: function() {
                var tempCartStrItems = []
                
                for (var i=0; i<productHandler.list.length; i++) {
                    for (var j=0; j<productHandler.quantity.get(i); j++) {
                        tempCartStrItems.push(productHandler.list[i].getId());
                    }
                }
                
                return tempCartStrItems.join("|");
            },
            write: function() {
                localStorage[this.cartName] = this.toString();
            },
            getNumItems: function() {
                var  itemTempCounter = 0
                for (var c=0; c < productHandler.list.length; c++) {
                    itemTempCounter += productHandler.quantity.get(c);
                }
                return itemTempCounter;
            }
        }
        
        return cartPVDR;
    }];
});

app.controller("cartCtrl", ['$scope', 'cartProvider', 'productHandler', function($scope, cartProvider, productHandler) {
    
    productHandler.load();
    
    $scope.cartAdd = function(id) {
        cartProvider.requestAdd(id);
    }
    
}]);