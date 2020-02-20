import axios from 'axios'
import { Message } from 'element-ui'
import store from '@/store'
import { setToken, getToken } from '@/utils/auth'

// token在Header中的key
const JWT_HEADER_KEY = 'authtoken'
// tokan自动刷新（发送心跳）的时间间隔（分钟）
const TOKEN_REFRESH_EXPIRE = 10
// 心跳计时器
let pingTimer = {}
setPingTimer()

// create an axios instance
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API, // url = base url + request url
  withCredentials: true, // send cookies when cross-domain requests
  timeout: 5000 // request timeout
})

// request interceptor
service.interceptors.request.use(
  config => {
    // do something before request is sent

    if (store.getters.token) {
      // let each request carry token
      // ['X-Token'] is a custom headers key
      // please modify it according to the actual situation
      config.headers[JWT_HEADER_KEY] = getToken()
    }
    return config
  },
  error => {
    // do something with request error
    console.log(error) // for debug
    return Promise.reject(error)
  }
)

// response interceptor
service.interceptors.response.use(
  /**
   * If you want to get http information such as headers or status
   * Please return  response => response
  */

  /**
   * Determine the request status by custom code
   * Here is just an example
   * You can also judge the status by HTTP Status Code
   */
  response => {
    // 检查是否携带有新的token
    const newToken = response.headers[JWT_HEADER_KEY]
    if (newToken) {
      // 将该token设置到vuex以及本地存储中
      setToken(newToken)
      store.commit('SET_TOKEN', newToken)
    }
    // 如果请求成功，则重置心跳定时器
    if (response.status === 200) {
      resetPingTimer()
    }

    const status = response.status
    if (status !== 200) {
      Message.error(
        response.data.statusText ? response.data.statusText : ''
      )
      return Promise.reject(response.data)
    } else {
      return response.data
    }
  },
  error => {
    let message = '网络可能出现问题'
    const status = error.response.status
    if (status === 500) {
      message = '服务器好像开小差了，重试下吧！'
    } else if (status === 400) {
      message = '提交数据出错'
    } else if (status === 401) {
      message = '没有权限'
    } else if (status === 403) {
      message = '无权访问'
    } else if (status === 404) {
      message = '请求资源不存在'
    }
    Message.error(message)
    return Promise.reject(error)
  }
)
// 自定义dibootApi请求快捷方式
const dibootApi = {
  get(url, params) {
    return service.get(url, {
      params
    })
  },
  post(url, data) {
    return service({
      method: 'POST',
      url,
      data: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json;charset=UTF-8'
      }
    })
  },
  put(url, data) {
    return service({
      method: 'PUT',
      url,
      data: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json;charset=UTF-8'
      }
    })
  },
  /**
   * 删除
   * @param url
   * @param params
   * @returns {AxiosPromise}
   */
  delete(url, params) {
    return service({
      url,
      method: 'DELETE',
      params,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json;charset=UTF-8'
      },
      withCredentials: true
    })
  },
  /** *
   * 上传文件接口
   * @param url
   * @param formData
   * @returns {AxiosPromise}
   */
  upload(url, formData) {
    return service({
      url,
      method: 'POST',
      data: formData
    })
  },
  /**
   * 导出
   * @param url
   * @param data
   * @returns {AxiosPromise}
   */
  download(url, data) {
    return service({
      url,
      method: 'POST',
      responseType: 'arraybuffer',
      observe: 'response',
      data: JSON.stringify(data),
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json;charset=UTF-8'
      },
      withCredentials: true
    })
  }
}

/**
 * 设置一个心跳定时器
 */
function setPingTimer() {
  pingTimer = setTimeout(() => {
    dibootApi.post('/iam/ping')
    resetPingTimer()
  }, TOKEN_REFRESH_EXPIRE * 60 * 1000)
}

/**
 * 重置一个心跳定时器
 */
function resetPingTimer() {
  clearTimeout(pingTimer)
  setPingTimer()
}

export default service
export {
  service as axios,
  dibootApi
}
