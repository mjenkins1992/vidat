const KEYFRAMES_PANEL_TEMPLATE = `
<div v-if="video.src" class="row">
  <q-list class="col-12 row">
    <q-item>
      <q-item-section class="text-center">
        <q-btn-group>
          <q-btn @click="handlePlayPause" :icon="isPaused ? 'play_arrow' : 'pause'">
            <q-tooltip>{{ isPaused ? 'pause (p)' : 'play (p)' }}</q-tooltip>
          </q-btn>
          <q-btn @click="handleStop" icon="stop" :disabled="!isShowVideoPlayer">
            <!--See: https://github.com/quasarframework/quasar/issues/7096-->
            <q-tooltip v-if="isShowVideoPlayer">stop</q-tooltip>
          </q-btn>
          <q-btn @click="showEdit = !showEdit" :icon="showEdit ? 'done' : 'edit'">
            <q-tooltip>{{ showEdit ? 'done' : 'edit' }}</q-tooltip>
          </q-btn>
        </q-btn-group>
      </q-item-section>
    </q-item>
    <q-item class="col">
      <q-range
        id="slider"
        ref="slider"
        :style="rangeStyle"
        class="custom-range"
        v-model="CurrentFrameRange"
        :min="0"
        :max="video.frames"
        :step="1"
        :left-label-text-color="currentFocus === 'left' || currentFocus === 'range' ? 'blue-grey-1' : 'primary'"
        :right-label-text-color="currentFocus === 'right' || currentFocus === 'range' ? 'blue-grey-1' : 'primary'"
        :left-label-color="currentFocus === 'left' || currentFocus === 'range' ? 'primary' : 'blue-grey-1'"
        :right-label-color="currentFocus === 'right' || currentFocus === 'range' ? 'primary' : 'blue-grey-1'"
        :left-label-value="'L: ' + CurrentFrameRange.min + ' | ' + toFixed2(index2time(CurrentFrameRange.min)) + ' s'"
        :right-label-value="'R: ' + CurrentFrameRange.max + ' | ' + toFixed2(index2time(CurrentFrameRange.max)) + ' s'"
        label-always
        drag-range
        snap
        @input="handleInput"
        :readonly="isShowVideoPlayer"
      ></q-range>
    </q-item>
    <q-space></q-space>
    <q-item>
      <q-item-section class="text-center">
        <q-btn-group>
          <q-btn @click="handlePreviousKeyframe" icon="keyboard_arrow_left">
            <q-tooltip>previous keyframe (<)</q-tooltip>
          </q-btn>
          <q-btn @click="handleNearestKeyframe" icon="gps_fixed">
            <q-tooltip>locate nearest keyframe</q-tooltip>
          </q-btn>
          <q-btn @click="handleNextKeyframe" icon="keyboard_arrow_right">
            <q-tooltip>next keyframe (>)</q-tooltip>
          </q-btn>
        </q-btn-group>
      </q-item-section>
    </q-item>
  </q-list>
  <keyframe-table v-if="showEdit"></keyframe-table>
</div>
`

import utils from '../../../libs/utils.js'
import keyframeTable from './keyframeTable.js'

export default {
  components: {
    keyframeTable,
  },
  data: () => {
    return {
      index2time: utils.index2time,
      toFixed2: utils.toFixed2,
      keyframeList: null,
      objectAnnotationListMap: null,
      regionAnnotationListMap: null,
      skeletonAnnotationListMap: null,
      actionAnnotationList: null,
      keyframeRangeStyle: {},
      objectAnnotationRangeStyle: {},
      regionAnnotationRangeStyle: {},
      skeletonAnnotationRangeStyle: {},
      actionAnnotationRangeStyle: {},
      showEdit: false,
      currentFocus: 'range', // 'left', 'right', 'range'
      inputValue: null,
      isShowVideoPlayer: false,
      isPaused: true,
      videoPlayTimeout: null,
      videoPlayInterval: null,
      lastLeftCurrentFrame: 0,
    }
  },
  methods: {
    ...Vuex.mapMutations([
      'setLeftCurrentFrame',
      'setRightCurrentFrame',
    ]),
    handlePlay () {
      this.isPaused = false
      const videoPlayer = document.getElementById('video-player')
      videoPlayer.play()

      const duration = (this.rightCurrentFrame / this.video.fps - videoPlayer.currentTime) * 1000
      this.videoPlayTimeout = setTimeout(() => {
        this.handleStop()
      }, duration)

      this.videoPlayInterval = setInterval(() => {
        this.moveLeftFrame(1)
      }, 1000 / this.video.fps)
    },
    handlePause () {
      clearTimeout(this.videoPlayTimeout)
      this.videoPlayTimeout = null

      clearInterval(this.videoPlayInterval)
      this.videoPlayInterval = null

      this.isPaused = true
      const videoPlayer = document.getElementById('video-player')
      videoPlayer.pause()
    },
    handlePlayPause () {
      const videoPlayer = document.getElementById('video-player')
      if (!this.isShowVideoPlayer) {
        this.isShowVideoPlayer = true
        this.lastLeftCurrentFrame = this.leftCurrentFrame
        videoPlayer.style.display = 'block'
        videoPlayer.currentTime = this.leftCurrentFrame / this.video.fps
        this.handlePlay()
      }
      else {
        if (this.isPaused) {
          this.handlePlay()
        }
        else {
          this.handlePause()
        }
      }
    },
    handleStop () {
      const videoPlayer = document.getElementById('video-player')
      videoPlayer.style.display = 'none'
      videoPlayer.pause()
      videoPlayer.currentTime = this.lastLeftCurrentFrame / this.video.fps

      this.isShowVideoPlayer = false
      this.isPaused = true

      clearTimeout(this.videoPlayTimeout)
      this.videoPlayTimeout = null

      clearInterval(this.videoPlayInterval)
      this.videoPlayInterval = null
      this.leftCurrentFrame = this.lastLeftCurrentFrame
    },
    handleInput (value) {
      if (this.inputValue) {
        if (this.inputValue.min !== value.min && this.inputValue.max !== value.max) {
          this.currentFocus = 'range'
        }
        else if (this.inputValue.min !== value.min) {
          this.currentFocus = 'left'
        }
        else {
          this.currentFocus = 'right'
        }
        this.inputValue = value
      }
      else {
        this.inputValue = value
      }
    },
    nearestKeyframe (currentFrame) {
      let min = this.video.frames
      let nearestKeyframe = currentFrame
      for (let i = 0; i < this.keyframeList.length; i++) {
        let distance = Math.abs(currentFrame - this.keyframeList[i])
        if (distance < min) {
          min = distance
          nearestKeyframe = this.keyframeList[i]
        }
      }
      return nearestKeyframe
    },
    handlePreviousKeyframe () { // base on right most one
      const leftCurrentKeyFrame = this.nearestKeyframe(this.leftCurrentFrame)
      const rightCurrentKeyFrame = this.nearestKeyframe(this.rightCurrentFrame)
      const leftCurrentKeyFrameIndex = this.keyframeList.indexOf(leftCurrentKeyFrame)
      const rightCurrentKeyFrameIndex = this.keyframeList.indexOf(rightCurrentKeyFrame)
      if (leftCurrentKeyFrameIndex <= 0 || rightCurrentKeyFrameIndex <= 0) {
        this.setLeftCurrentFrame(0)
        this.setRightCurrentFrame(this.keyframeList[1] || 0)
      }
      else if (leftCurrentKeyFrameIndex === rightCurrentKeyFrameIndex) {
        this.setLeftCurrentFrame(this.keyframeList[rightCurrentKeyFrameIndex - 1])
        this.setRightCurrentFrame(rightCurrentKeyFrame)
      }
      else if (leftCurrentKeyFrameIndex < rightCurrentKeyFrameIndex) {
        if (rightCurrentKeyFrameIndex - 2 < 0) {
          this.setLeftCurrentFrame(0)
          this.setRightCurrentFrame(this.keyframeList[1] || 0)
        }
        else {
          this.setLeftCurrentFrame(this.keyframeList[rightCurrentKeyFrameIndex - 2])
          this.setRightCurrentFrame(this.keyframeList[rightCurrentKeyFrameIndex - 1])
        }
      }
      else {
        this.setLeftCurrentFrame(rightCurrentKeyFrame)
        this.setRightCurrentFrame(leftCurrentKeyFrame)
      }
    },
    handleNearestKeyframe () {
      const leftCurrentKeyFrame = this.nearestKeyframe(this.leftCurrentFrame)
      const rightCurrentKeyFrame = this.nearestKeyframe(this.rightCurrentFrame)
      const leftCurrentKeyFrameIndex = this.keyframeList.indexOf(leftCurrentKeyFrame)
      const rightCurrentKeyFrameIndex = this.keyframeList.indexOf(rightCurrentKeyFrame)
      if (rightCurrentKeyFrameIndex - leftCurrentKeyFrameIndex === 1) {
        this.setLeftCurrentFrame(leftCurrentKeyFrame)
        this.setRightCurrentFrame(rightCurrentKeyFrame)
      }
      else {
        this.setLeftCurrentFrame(leftCurrentKeyFrame)
        this.setRightCurrentFrame(this.keyframeList[leftCurrentKeyFrameIndex + 1] || leftCurrentKeyFrame)
      }
    },
    handleNextKeyframe () { // base on left most one
      const leftCurrentKeyFrame = this.nearestKeyframe(this.leftCurrentFrame)
      const rightCurrentKeyFrame = this.nearestKeyframe(this.rightCurrentFrame)
      const leftCurrentKeyFrameIndex = this.keyframeList.indexOf(leftCurrentKeyFrame)
      const rightCurrentKeyFrameIndex = this.keyframeList.indexOf(rightCurrentKeyFrame)
      const lastIndex = this.keyframeList.length - 1
      if (leftCurrentKeyFrameIndex >= lastIndex || rightCurrentKeyFrameIndex >= lastIndex) {
        this.setLeftCurrentFrame(this.keyframeList[lastIndex - 1] || this.keyframeList[lastIndex])
        this.setRightCurrentFrame(this.keyframeList[lastIndex])
      }
      else if (leftCurrentKeyFrameIndex === rightCurrentKeyFrameIndex) {
        this.setLeftCurrentFrame(leftCurrentKeyFrame)
        this.setRightCurrentFrame(this.keyframeList[leftCurrentKeyFrameIndex + 1])
      }
      else if (leftCurrentKeyFrameIndex < rightCurrentKeyFrameIndex) {
        if (leftCurrentKeyFrameIndex + 2 > lastIndex) {
          this.setLeftCurrentFrame(this.keyframeList[lastIndex - 1] || this.keyframeList[lastIndex])
          this.setRightCurrentFrame(this.keyframeList[lastIndex])
        }
        else {
          this.setLeftCurrentFrame(this.keyframeList[leftCurrentKeyFrameIndex + 1])
          this.setRightCurrentFrame(this.keyframeList[leftCurrentKeyFrameIndex + 2])
        }
      }
      else {
        this.setLeftCurrentFrame(leftCurrentKeyFrame)
        this.setRightCurrentFrame(this.keyframeList[leftCurrentKeyFrameIndex + 1])
      }
    },
    moveLeftFrame (delta) {
      if (this.leftCurrentFrame + delta >= 0 && this.leftCurrentFrame + delta <= this.video.frames) {
        // this.leftCurrentFrame += delta // Black magic: do not know why this line does not work
        this.setLeftCurrentFrame(this.$store.state.annotation.leftCurrentFrame + delta)
      }
    },
    moveRightFrame (delta) {
      if (this.rightCurrentFrame + delta >= 0 && this.rightCurrentFrame + delta <= this.video.frames) {
        // this.rightCurrentFrame += delta // Black magic: do not know why this line does not work
        this.setRightCurrentFrame(this.$store.state.annotation.rightCurrentFrame + delta)
      }
    },
    moveRange (interval) {
      if (interval < 0) {
        if (Math.min(this.leftCurrentFrame, this.rightCurrentFrame) + interval >= 0) {
          this.leftCurrentFrame += interval
          this.rightCurrentFrame += interval
        }
      }
      else {
        if (Math.max(this.leftCurrentFrame, this.rightCurrentFrame) + interval <= this.video.frames) {
          this.leftCurrentFrame += interval
          this.rightCurrentFrame += interval
        }
      }
    },
    handleKeyup (event) {
      if (event.target.nodeName.toLowerCase() === 'input' || event.target.tabIndex === 0) {
        return false
      }
      if (event.code === 'KeyP') {
        this.handlePlayPause()
      }
    },
    handleKeydown (event) {
      if (this.isShowVideoPlayer) {
        return
      }
      if (event.target.nodeName.toLowerCase() === 'input') {
        return false
      }
      if (event.code === 'ArrowLeft') {
        const delta = -1
        if (this.currentFocus === 'range') {
          this.moveRange(delta)
        }
        else if (this.currentFocus === 'left') {
          this.moveLeftFrame(delta)
        }
        else if (this.currentFocus === 'right') {
          this.moveRightFrame(delta)
        }
      }
      else if (event.code === 'ArrowRight') {
        const delta = 1
        if (this.currentFocus === 'range') {
          this.moveRange(delta)
        }
        else if (this.currentFocus === 'left') {
          this.moveLeftFrame(delta)
        }
        else if (this.currentFocus === 'right') {
          this.moveRightFrame(delta)
        }
      }
      else if (event.code === 'ArrowUp') {
        this.currentFocus = {
          left: 'right',
          range: 'left',
          right: 'range',
        }[this.currentFocus]
        event.preventDefault()
      }
      else if (event.code === 'ArrowDown') {
        this.currentFocus = {
          left: 'range',
          range: 'right',
          right: 'left',
        }[this.currentFocus]
        event.preventDefault()
      }
      else if (event.code === 'PageUp') {
        const delta = Math.round(-0.1 * this.video.frames)
        if (this.currentFocus === 'range') {
          this.moveRange(delta)
        }
        else if (this.currentFocus === 'left') {
          this.moveLeftFrame(delta)
        }
        else if (this.currentFocus === 'right') {
          this.moveRightFrame(delta)
        }
      }
      else if (event.code === 'PageDown') {
        const delta = Math.round(0.1 * this.video.frames)
        if (this.currentFocus === 'range') {
          this.moveRange(delta)
        }
        else if (this.currentFocus === 'left') {
          this.moveLeftFrame(delta)
        }
        else if (this.currentFocus === 'right') {
          this.moveRightFrame(delta)
        }
      }
      else if (event.code === 'Comma') {
        this.handlePreviousKeyframe()
      }
      else if (event.code === 'Period') {
        this.handleNextKeyframe()
      }
    },
    handleOnresize (event) {
      this.updateKeyframeRangeStyle(this.keyframeList)
      this.updateObjectAnnotationRangeStyle(this.objectAnnotationListMap)
      this.updateRegionAnnotationRangeStyle(this.regionAnnotationListMap)
      this.updateSkeletonAnnotationRangeStyle(this.skeletonAnnotationListMap)
      this.updateActionAnnotationRangeStyle(this.actionAnnotationList)
    },
    updateKeyframeRangeStyle (keyframeList) {
      if (this.video.frames) {
        const ticksBg = []
        const ticksBgPos = []
        const ticksBgSize = []
        const sliderWidth = this.$refs.slider ? this.$refs.slider.$el.clientWidth : 0
        // keyframe
        for (const frame of keyframeList) {
          const color = 'black'
          const size = {
            width: sliderWidth / this.video.frames,
            height: 4,
          }
          const position = {
            x: frame / this.video.frames * sliderWidth - size.width / 2,
            y: 8,
          }
          ticksBg.push(`linear-gradient(to right, ${color} 0, ${color} 100%)`)
          ticksBgPos.push(`${position.x}px ${position.y}px`)
          ticksBgSize.push(`${size.width}px ${size.height}px`)
        }
        this.keyframeRangeStyle = {
          '--tick-bg': ticksBg.join(', '),
          '--tick-bg-pos': ticksBgPos.join(', '),
          '--tick-bg-size': ticksBgSize.join(', '),
        }
      }
    },
    getAnnotationRangeStyle (annotationListMap, color, positionY) {
      const ticksBg = []
      const ticksBgPos = []
      const ticksBgSize = []
      const sliderWidth = this.$refs.slider ? this.$refs.slider.$el.clientWidth : 0
      for (const frame in annotationListMap) {
        if (annotationListMap[frame].length !== 0) {
          const size = {
            width: sliderWidth / this.video.frames,
            height: 4,
          }
          const position = {
            x: frame / this.video.frames * sliderWidth - size.width / 2,
            y: positionY - 1,
          }
          ticksBg.push(`linear-gradient(to right, ${color} 0, ${color} 100%)`)
          ticksBgPos.push(`${position.x}px ${position.y}px`)
          ticksBgSize.push(`${size.width}px ${size.height}px`)
        }
      }
      return {
        '--tick-bg': ticksBg.join(', '),
        '--tick-bg-pos': ticksBgPos.join(', '),
        '--tick-bg-size': ticksBgSize.join(', '),
      }
    },
    updateObjectAnnotationRangeStyle (objectAnnotationListMap) {
      if (objectAnnotationListMap && this.video.frames) {
        this.objectAnnotationRangeStyle = this.getAnnotationRangeStyle(objectAnnotationListMap, 'blue', 20)
      }
    },
    updateRegionAnnotationRangeStyle (regionAnnotationListMap) {
      if (regionAnnotationListMap && this.video.frames) {
        this.regionAnnotationRangeStyle = this.getAnnotationRangeStyle(regionAnnotationListMap, 'red', 27)
      }
    },
    updateSkeletonAnnotationRangeStyle (skeletonAnnotationListMap) {
      if (skeletonAnnotationListMap && this.video.frames) {
        this.skeletonAnnotationRangeStyle = this.getAnnotationRangeStyle(skeletonAnnotationListMap, 'green', 34)
      }
    },
    updateActionAnnotationRangeStyle (actionAnnotationList) {
      if (actionAnnotationList && this.video.frames) {
        const ticksBg = []
        const ticksBgPos = []
        const ticksBgSize = []
        const sliderWidth = this.$refs.slider ? this.$refs.slider.$el.clientWidth : 0
        for (const actionAnnotation of actionAnnotationList) {
          if (typeof actionAnnotation.start === 'number' && typeof actionAnnotation.end === 'number') {
            const startFrame = utils.time2index(actionAnnotation.start)
            const endFrame = utils.time2index(actionAnnotation.end)
            const color = 'purple'
            const position = {
              x: startFrame / this.video.frames * sliderWidth - sliderWidth / this.video.frames / 2,
              y: 40,
            }
            const size = {
              width: (endFrame - startFrame + 1) / this.video.frames * sliderWidth,
              height: 4,
            }
            ticksBg.push(`linear-gradient(to right, ${color} 0, ${color} 100%)`)
            ticksBgPos.push(`${position.x}px ${position.y}px`)
            ticksBgSize.push(`${size.width}px ${size.height}px`)
          }
        }
        this.actionAnnotationRangeStyle = {
          '--tick-bg': ticksBg.join(', '),
          '--tick-bg-pos': ticksBgPos.join(', '),
          '--tick-bg-size': ticksBgSize.join(', '),
        }
      }
    },
  },
  computed: {
    video () {
      return this.$store.state.annotation.video
    },
    leftCurrentFrame: {
      get () {
        return this.$store.state.annotation.leftCurrentFrame
      },
      set (value) {
        this.setLeftCurrentFrame(value)
      },
    },
    rightCurrentFrame: {
      get () {
        return this.$store.state.annotation.rightCurrentFrame
      },
      set (value) {
        this.setRightCurrentFrame(value)
      },
    },
    CurrentFrameRange: {
      get () {
        return {
          min: this.leftCurrentFrame,
          max: this.rightCurrentFrame,
        }
      },
      set (value) {
        this.setLeftCurrentFrame(value.min)
        this.setRightCurrentFrame(value.max)
      },
    },
    rangeStyle () {
      const rangeStyle = {
        height: '73px',
      }
      for (const key of ['--tick-bg', '--tick-bg-pos', '--tick-bg-size']) {
        rangeStyle[key] = this.keyframeRangeStyle[key]
        if (this.objectAnnotationRangeStyle[key]) {
          rangeStyle[key] += ',' + this.objectAnnotationRangeStyle[key]
        }
        if (this.regionAnnotationRangeStyle[key]) {
          rangeStyle[key] += ',' + this.regionAnnotationRangeStyle[key]
        }
        if (this.skeletonAnnotationRangeStyle[key]) {
          rangeStyle[key] += ',' + this.skeletonAnnotationRangeStyle[key]
        }
        if (this.actionAnnotationRangeStyle[key]) {
          rangeStyle[key] += ',' + this.actionAnnotationRangeStyle[key]
        }
      }
      return rangeStyle
    },
  },
  watch: {
    '$store.state.annotation.keyframeList': {
      handler (keyframeList) {
        this.keyframeList = keyframeList
        this.updateKeyframeRangeStyle(keyframeList)
      },
      immediate: true,
    },
    '$store.state.annotation.objectAnnotationListMap': {
      handler (objectAnnotationListMap) {
        this.objectAnnotationListMap = objectAnnotationListMap
        this.updateObjectAnnotationRangeStyle(objectAnnotationListMap)
      },
      immediate: true,
      deep: true,
    },
    '$store.state.annotation.regionAnnotationListMap': {
      handler (regionAnnotationListMap) {
        this.regionAnnotationListMap = regionAnnotationListMap
        this.updateRegionAnnotationRangeStyle(regionAnnotationListMap)
      },
      immediate: true,
      deep: true,
    },
    '$store.state.annotation.skeletonAnnotationListMap': {
      handler (skeletonAnnotationListMap) {
        this.skeletonAnnotationListMap = skeletonAnnotationListMap
        this.updateSkeletonAnnotationRangeStyle(skeletonAnnotationListMap)
      },
      immediate: true,
      deep: true,
    },
    '$store.state.annotation.actionAnnotationList': {
      handler (actionAnnotationList) {
        this.actionAnnotationList = actionAnnotationList
        this.updateActionAnnotationRangeStyle(actionAnnotationList)
      },
      immediate: true,
      deep: true,
    },
    '$store.state.annotation.video.frames': {
      handler () {
        this.handleOnresize()
      },
      immediate: true,
    },
  },
  mounted () {
    window.addEventListener('keyup', this.handleKeyup)
    window.addEventListener('keydown', this.handleKeydown)
    window.addEventListener('resize', this.handleOnresize)

    const slider = document.getElementById('slider')
    slider.childNodes[1].removeAttribute('tabindex')
    slider.childNodes[2].removeAttribute('tabindex')

    const drawer = document.getElementById('drawer')
    drawer.addEventListener('transitionend', this.handleOnresize)
  },
  destroyed () {
    window.removeEventListener('keyup', this.handleKeyup)
    window.removeEventListener('keydown', this.handleKeydown)
    window.removeEventListener('resize', this.handleOnresize)
    const drawer = document.getElementById('drawer')
    drawer.removeEventListener('transitionend', this.handleOnresize)
    clearInterval(this.videoPlayInterval)
    clearTimeout(this.videoPlayTimeout)
  },
  template: KEYFRAMES_PANEL_TEMPLATE,
}
