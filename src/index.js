import { Hono } from "hono/quick"
const app = new Hono()
import { cors } from 'hono/cors'
import { bearerAuth } from "hono/bearer-auth"
import { env } from "cloudflare:workers"
import { rateLimiter } from "hono-rate-limiter"

const apiVer = "v1"
const apiToken = env.API_TOKEN ?? "apitoken"

app.use("/*",cors({
	origin: "*",
	allowMethods: ['GET', 'POST', 'PUT']
}))

app.use(`/${apiVer}/version/*`,bearerAuth({
	token: apiToken
}))

app.use(`/${apiVer}/*`, rateLimiter({
	binding: (c) => c.env.RATELIMITER,
	keyGenerator: (c) => c.req.header("cf-connecting-ip") ?? "",
}))

class TemplateResp{
	constructor(status,message,data){
		this.status = status
		this.message = message
		this.data = data
	}
	dump() {
		let temp = {
			"success": this.status,
			"message": this.message,
			"data": this.data
		}
		return temp
	}
}

app.get('/', (c) => {
	// 检查服务
	const resp = new TemplateResp(true,"服务正常运行",null)
	return c.json(resp.dump())
}).get(`/${apiVer}`, async (c) => {
	// 获取版本
	const ua = c.req.header('User-Agent')
	var pattern = new RegExp("^LimbusLocalizeTool/[0-9]\.[0-9]\.[0-9]$")
	if(!pattern.test(ua)){
		const resp = new TemplateResp(false,"非客户端请求",null)
		c.status(401)
		return c.json(resp.dump())
	}
	const major = await c.env.LLT.get("VERSION_MAJOR")
	const minor = await c.env.LLT.get("VERSION_MINOR")
	const patch = await c.env.LLT.get("VERSION_PATCH")
	const resp = new TemplateResp(true,"成功",{"major": parseInt(major),"minor": parseInt(minor),"patch": parseInt(patch)})
	return c.json(resp.dump())
}).put(`/${apiVer}/version/major`, async (c) => {
	// 增加major版本号
	const majr = await c.env.LLT.get("VERSION_MAJOR")
	const major = parseInt(majr)
	await c.env.LLT.put("VERSION_MAJOR",parseInt(major) + 1)
	return c.json(new TemplateResp(true,"成功",{"new_major": major + 1}).dump())
}).put(`/${apiVer}/version/minor`, async (c) => {
	// 增加minor版本号
	const minr = await c.env.LLT.get("VERSION_MINOR")
	const minor = parseInt(minr)
	await c.env.LLT.put("VERSION_MINOR",minor + 1)
	return c.json(new TemplateResp(true,"成功",{"new_minor": minor + 1}).dump())
}).put(`/${apiVer}/version/patch`, async (c) => {
	// 增加patch版本号
	const pach = await c.env.LLT.get("VERSION_PATCH")
	const patch = parseInt(pach)
	await c.env.LLT.put("VERSION_PATCH",patch + 1)
	return c.json(new TemplateResp(true,"成功",{"new_patch": patch + 1}).dump())
}).get(`/${apiVer}/translation`, async (c) => {
	// 获取译文版本号（yyyymmdd[a]）
	const resp = await fetch("https://api.github.com/repos/bighardwin10/LimbusAutoLocalize/releases/latest",{headers: {"User-Agent": "LimbusLocalizeTool"}})
	if(!resp.ok || resp.status != 200){
		c.status(500)
		console.error(resp.status)
		return c.json(new TemplateResp(false,"Github API错误",null).dump())
	}
	const json = await resp.json()
	const versionTag = json.tag_name
	return c.json(new TemplateResp(true,"成功",{"version": versionTag}))
}).get(`/${apiVer}/translation/file`, async (c) => {
	// 代理r2译文下载
	const resp = await fetch("https://api.github.com/repos/bighardwin10/LimbusAutoLocalize/releases/latest",{headers: {"User-Agent": "LimbusLocalizeTool"}})
	if(!resp.ok || resp.status != 200){
		c.status(resp.status)
		console.error(resp.status)
		return c.json(new TemplateResp(false,"Github API错误",null).dump())
	}
	const json = await resp.json()
	const versionTag = json.tag_name
	const headers = c.req.raw.headers
	const object = await c.env.R2.get(`LimbusAutoLocalize_${versionTag}`,{
		onlyIf: headers,
		range: headers
	})
	if(object == null){
		return c.json(new TemplateResp(404,"未找到翻译文件，请尝试联系开发者",null),404)
	}
	const respHeaders = new Headers()
	object.writeHttpMetadata(respHeaders)
	respHeaders.set('etag', object.httpEtag)
	const hasBody = 'body' in object
	return new Response(hasBody ? object.body : null, {
    	status: hasBody ? 200 : 412,
    	headers: respHeaders,
  	})
})

export default app