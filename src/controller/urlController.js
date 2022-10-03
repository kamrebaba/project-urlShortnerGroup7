 const shortid = require('shortid')
const shortId = require('shortid')
const validUrl = require('valid-url')
const urlModel = require("../model/urlModel")
const redis = require('redis')
const {promisify}= require("util")

//Connect to redis
const redisClient = redis.createClient(
    13631,
    "redis-13631.c301.ap-south-1-1.ec2.cloud.redislabs.com",
    { no_ready_check: true }
  );
  redisClient.auth("wyyIMitZQ2OeeYVP1arHZjBze790bVNX", function (err) {
    if (err) throw err;
  });
  
  redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
  });
  
  
  
  //1. connect to the server
  //2. use the commands :
  
  //Connection setup for redis
  
  const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
  const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);
  

const urlShortner = async function (req, res) {
    try {
        let { longUrl } = req.body
        if (!longUrl) return res.status(400).send({ status: false, msg: "provide url" })
        if (!validUrl.isUri(longUrl)) return res.status(400).send({ status: false, msg: "invalid url" })
        let findUrl  = await urlModel.findOne({longUrl: longUrl}).select({longUrl : 1 , urlCode : 1 , shortUrl : 1 , _id : 0});
        if(findUrl){
            return res.status(409).send({message : "This URL has already being shortened" , data : findUrl})
        }
        let urlCode = shortId.generate().toLowerCase()
        req.body.urlCode = urlCode
        const baseUrl = "http://localhost:3000"
        if (!validUrl.isUri(baseUrl)) return res.status(400).send({ status: false, msg: "invalid baseUrl" })
        const shortUrl = baseUrl + '/' + urlCode
        console.log(shortUrl)
        req.body.shortUrl = shortUrl
        const data = await urlModel.create(req.body)
        await SET_ASYNC(`${urlCode}`, JSON.stringify(data));
        return res.status(201).send({ status: true, msg:req.body })
    }
    catch (error) {
        return res.status(500).send({ status: false, msg: error.message })
    }
}

const getUrl = async function(req , res){
    try{
        let urlCode = req.params.urlCode;
        if(!shortid.isValid(urlCode)){
            return res.status(400).send({ status: false, msg: "invalid urlcode" })
        }
        const cachedUrl= await GET_ASYNC(`${urlCode}`)
        const parseUrl=JSON.parse(cachedUrl)
        if(parseUrl){
            console.log(parseUrl)
            return res.status(302).redirect(parseUrl.longUrl)
        }
        console.log("roger-roger")
        let url = await urlModel.findOne({urlCode : urlCode});
        if(!url){
            return res
        .status(404)
        .send({ status: false, msg: "url Document not Found" })

        }
        await SET_ASYNC(`${urlCode}`, JSON.stringify(url));
        return res.status(302).redirect(url.longUrl)

    }catch (error) {
        return res.status(500).send({ status: false, msg: error.message })
    }
}

module.exports = { urlShortner , getUrl }