//SW version
const version = '1.2';

//static cache
const appAssets =[
    'index.html',
    'main.js',
    'images/flame.png',
    'images/logo.png',
    'images/sync.png',
    'vendor/bootstrap.min.css',
    'vendor/jquery.min.js'
];

//SW install
self.addEventListener('install',e=>{
    e.waitUntil(
        caches.open(`static-${version}`)
            .then(cache => cache.addAll(appAssets))
    );
});

//SW Activate

self.addEventListener('activate',e=>{
    //clean static cache
    let cleaned = caches.keys().then(keys =>{
       keys.forEach(key =>{
          if(key !== `static-${version}`&&key.match(`static-`)){
              return caches.delete(key);
          }
       });
    });

    e.waitUntil(cleaned);
});

//static cache
const staticCache = (req,cacheName=`static-${version}`)=>{
    return caches.match(req).then(cachedRes =>{
       //return cached if found
       if(cachedRes) return cachedRes;

       //fallback to network
        return fetch(req).then(networkRes =>{
           //update cache with new response
           caches.open(cacheName)
               .then(cache => cache.put(req,networkRes));
           //return clone
            return networkRes.clone();
        });
    });
}

//Network with cache fallback
const fallbackCache= (req)=>{
    //try network
    return fetch(req).then(networkRes =>{
       //check res is ok, else go to cache
       if(!networkRes.ok)throw 'Fetch Error';
       //update cache
        caches.open(`static-${version}`)
            .then(cache => cache.put(req,networkRes));
        //return clone to network response
        return networkRes.clone();
    })
    //try cache
    .catch(err => caches.match(req));
};

//clean old giphys from the giphy cache
const cleanGiphyCache=(giphys)=>{
    caches.open('giphy').then(cache =>{
        //get all entries
        cache.keys().then(keys =>{
            keys.forEach(key =>{
                //if entry is not part of current giphys, Delete
                if(!giphys.includes(key.url)) cache.delete(key);
            }) ;
        });
    });
}

//SW Fetch
self.addEventListener('fetch',e=>{
    //App shell
    if(e.request.url.match(location.origin)){
        e.respondWith(staticCache(e.request));

    //giphy API
    }else if(e.request.url.match('api.giphy.com/v1/gifs/trending')){
        e.respondWith(fallbackCache(e.request));

    //Giphy media
    }else if(e.request.url.match('giphy.com/media')){
        e.respondWith(staticCache(e.request,'giphy'));
    }
});

//listen messages from client
self.addEventListener('message',e=>{
    //identify the message
    if(e.data.action ==='cleanGiphyCache') cleanGiphyCache(e.data.giphys);
});