import DHT from 'hyperdht'
import b4a from 'b4a'
import Protomux from 'protomux'
import Channel from 'jsonrpc-mux'
import {html, render} from 'lit-html'

const editorOptions = {
  disable_collapse: true,
  disable_properties: true
}
const dht = new DHT()

document.getElementById('connect').addEventListener('click', () => {
  const peerKey = document.getElementById('peerKey').value
  destroy()
  connect(peerKey)
})

function destroy () {
    document.getElementById('api').style.display = 'none'
    document.getElementById('role').innerHTML = ''
    document.getElementById('version').innerHTML = ''
    document.getElementById('description').innerHTML = ''
}


const paramTemplate = (name, param) => {
  if (param.not) return html`<p>no parameters</p>`
  return html`
<div>
  <h6>parameters</h6>
  <div id="${name}-param"></div>
</div>
`
}

const headerTemplate = (name, header) => {
  if (header.not) return html``
  return html`
<div>
  <h6>headers</h6>
  <div id="${name}-header"></div>
</div>
`
}

const routeTemplate = (route) => html`
<div>
  <h5>${route.name}</h5>
  <div>${paramTemplate(route.name, route.paramSchema)}</div>
  <div>${headerTemplate(route.name, route.headerSchema)}</div>
  <div><button id="${route.name}-button">Execute</button>
  <pre class="response" id="${route.name}-response"></pre>
</div>
`
const routesTemplate = (routes) => html`
<div>${routes.map(routeTemplate)}</div>
`;

function connect (peerKey) {
  const publicKey = b4a.from(peerKey, 'hex')
  const conn = dht.connect(publicKey)
  const framed = new Channel(new Protomux(conn))
  conn.once('open', async () => {
    const api = await framed.request('_swag', {})

    document.getElementById('api').style.display = 'block'
    document.getElementById('role').innerHTML = api.role
    document.getElementById('version').innerHTML = api.version
    document.getElementById('description').innerHTML = api.description

    const routesHolder = document.getElementById('routes')
    render(routesTemplate(api.routes), routesHolder)
    api.routes.forEach(route => {
      let paramEditor = null
      let headerEditor = null
      if (!route.paramSchema.not) {
        const el = document.getElementById(`${route.name}-param`)
        console.log(el)
        paramEditor = new JSONEditor(el, { schema: route.paramSchema, ...editorOptions }) 
      }
      if (!route.headerSchema.not) {
        const el = document.getElementById(`${route.name}-header`)
        headerEditor = new JSONEditor(el, { schema: route.headerSchema, ...editorOptions}) 
      }
      document.getElementById(`${route.name}-button`).addEventListener('click', async () => {
        const payload = {}
        if (paramEditor) payload.params = paramEditor.getValue()
        if (headerEditor) payload.headers = headerEditor.getValue()
        console.log('payload', payload)
        const start = Date.now()
        let end = null
        try {
          const result = await framed.request(route.name, payload)
          const el = document.getElementById(`${route.name}-response`)
          el.innerHTML = result
          el.style.display = 'block'
        } catch (e) {
          console.log(e)
          const el = document.getElementById(`${route.name}-response`)
          el.innerHTML = e.toString() 
          el.style.display = 'block'
        } finally {
          end = Date.now()
          const time = end - start
          console.log('response time', time)
        }
      })
    })
  })
}




