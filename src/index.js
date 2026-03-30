import { Hono } from "hono/quick"
const app = new Hono()
import { cors } from 'hono/cors'
import { bearerAuth } from "hono/bearer-auth"
import { env } from "cloudflare:workers"

const apiVer = "v1"
const apiToken = env.API_TOKEN

app.use("/*",cors({
	origin: "*",
	allowMethods: ['GET', 'POST']
}))

app.use(`/${apiVer}/version/*`,bearerAuth({
	token: apiToken
}))

class TemplateResp{
	constructor(status,message,data){
		this.status = status
		this.message = message
		this.data = data
	}
	dump() {
		let temp = {
			"status": this.status,
			"message": this.message,
			"data": this.data
		}
		return temp
	}
}

app.get('/', (c) => {
	// 检查服务
	const resp = new TemplateResp(200,"服务正常运行",null)
	return c.json(resp.dump())
}).get(`/${apiVer}`, async (c) => {
	// 获取版本
	const ua = c.req.header('User-Agent')
	var pattern = new RegExp("^LimbusLocalizeTool/[0-9]\.[0-9]\.[0-9]$")
	if(!pattern.test(ua)){
		const resp = new TemplateResp(401,"非客户端请求",null)
		c.status(401)
		return c.json(resp.dump())
	}
	const major = await c.env.LLT.get("VERSION_MAJOR")
	const minor = await c.env.LLT.get("VERSION_MINOR")
	const patch = await c.env.LLT.get("VERSION_PATCH")
	const resp = new TemplateResp(200,"成功",{"major": parseInt(major),"minor": parseInt(minor),"patch": parseInt(patch)})
	return c.json(resp.dump())
}).put(`/${apiVer}/version/major`, async (c) => {
	const major = parseInt(await c.env.LLT.get("VERSION_MAJOR"))
	await c.env.LLT.put("VERSION_MAJOR",major + 1)
	return c.json(new TemplateResp(200,"成功",{"new_major": major + 1}).dump())
}).put(`/${apiVer}/version/minor`, async (c) => {
	const minor = parseInt(await c.env.LLT.get("VERSION_MINOR"))
	await c.env.LLT.put("VERSION_MINOR",minor + 1)
	return c.json(new TemplateResp(200,"成功",{"new_minor": minor + 1}).dump())
}).put(`/${apiVer}/version/patch`, async (c) => {
	const patch = parseInt(await c.env.LLT.get("VERSION_PATCH"))
	await c.env.LLT.put("VERSION_PATCH",patch + 1)
	return c.json(new TemplateResp(200,"成功",{"new_patch": patch + 1}).dump())
})

export default app