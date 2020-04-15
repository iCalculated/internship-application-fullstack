
const variantsAPI = 'https://cfw-takehome.developers.workers.dev/api/variants'
const COOKIE_NAME = 'VAR'

/**
 * Fetches variant URLs from the API
 */
async function getVariantsURL() {
  let response = await fetch(variantsAPI)
  let json = await response.json()
  return json.variants
}

/**
 * Creates stream and customizes field
 */
async function getResponseStream(url) {
  // https://developers.cloudflare.com/workers/reference/apis/streams/#streaming-passthrough
  let response = await fetch(url)
  let rewriter = new HTMLRewriter()
    .on('title', new MetaRewriter())
    .on('p#description', new BodyRewriter())
    .on('a#url', new LinkRewriter())
  return rewriter.transform(response)
}

// TODO: make this more succinct
class LinkRewriter {
  element(el) {
      el.setAttribute('href','https://github.com/iCalculated')
      el.setInnerContent('See Sasha\'s GitHub')
  }
}

class MetaRewriter {
  element(el) {
      el.before('<meta charset="utf-8">', { html: true })
      el.prepend('This is ')
  }
}

class BodyRewriter {
  element(el) {
      el.setInnerContent('Please pretend I put something clever here (or don\'t). Left alone, the cookie will last for a week.')
  }
}

async function handleRequest(request) {
  let urls = await getVariantsURL()

  const VAR1 = await getResponseStream(urls[0])
  const VAR2 = await getResponseStream(urls[1])
  const cookie = getCookie(request, COOKIE_NAME)

  // https://developers.cloudflare.com/workers/templates/pages/ab_testing/
  if (cookie === 'var1') { return VAR1 }
  else if (cookie === 'var2') { return VAR2 }
  else {
    let group = Math.random() < 0.5 ? 'var1' : 'var2' 
    let response = group === 'var1' ? VAR1 : VAR2;
    let expiry = new Date()
    expiry.setDate(expiry.getDate() + 7) // expire in one week
    response.headers.append('Set-Cookie', `${COOKIE_NAME}=${group}; Secure; Expires=${expiry.toGMTString()}; path=/`)
    return response
  }
}

// https://developers.cloudflare.com/workers/templates/pages/cookie_extract/
function getCookie(request, name) {
  let result = null
  let cookieString = request.headers.get('Cookie')
  if (cookieString) {
    let cookies = cookieString.split(';')
    cookies.forEach(cookie => { 
      let cookieName = cookie.split('=')[0].trim() 
      if (cookieName === name) { 
        let cookieVal = cookie.split('=')[1] 
        result = cookieVal 
      } 
    }) 
  } 
  return result 
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})
