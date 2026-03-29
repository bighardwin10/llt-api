import { Hono } from "hono/quick"
const app = new Hono()
import { cors } from 'hono/cors'

const apiVer = "v1"

app.use("/*",cors({
	origin: "*",
	allowMethods: ['GET', 'POST']
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
	const resp = new TemplateResp(200,"服务正常运行",null)
	return c.json(resp.dump())
}).get(`/${apiVer}`, async (c) => {
	const ua = c.req.header('User-Agent')
	var pattern = new RegExp("^LimbusLocalizeTool/[0-9]\.[0-9]\.[0-9]$")
	if(!pattern.test(ua)){
		const resp = new TemplateResp(403,"非客户端请求",null)
		c.status(403)
		return c.json(resp.dump())
	}
	const major = await parseInt(c.env.LLT.get("VERSION_MAJOR"))
	const minor = await parseInt(c.env.LLT.get("VERSION_MINOR"))
	const patch = await parseInt(c.env.LLT.get("VERSION_PATCH"))
	const resp = new TemplateResp(200,"成功",{"major": major,"minor": minor,"patch": patch})
	return c.json(resp.dump())
})

export default app