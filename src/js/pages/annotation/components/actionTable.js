const ACTION_TABLE_TEMPLATE = `
<q-table
  dense
  flat
  :data="actionAnnotationList"
  :columns="columnList"
  :pagination="pagination"
  :filter="{ value: actionFilterList }"
  :filter-method="actionFilter"
>
  <template v-slot:top="props">
    <div class="col-6 q-table__title">Actions / Video Segments</div>
    <q-space></q-space>
    <q-btn-group>
      <q-btn :icon="filter ? 'expand_more' : 'expand_less'" @click="filter = !filter" label="filter"></q-btn>
      <q-btn icon="add" @click="handleAdd" label="add">
        <q-tooltip>add current range (+)</q-tooltip>
      </q-btn>
      <q-btn icon="clear_all" @click="handleClearAll" label="clear"></q-btn>
    </q-btn-group>
    <div class="" v-if="filter">
      <div class="q-mb-sm">
        <q-btn-group dense flat>
          <q-btn icon="apps" @click="handleSelectAll">
            <q-tooltip>select all actions</q-tooltip>
          </q-btn>
          <q-btn icon="clear_all" @click="handleClearSelectedAll">
            <q-tooltip>clear all actions</q-tooltip>
          </q-btn>
        </q-btn-group>
      </div>
      <div class="q-gutter-xs row truncate-chip-labels">
        <q-chip
          v-for="action in actionLabelData"
          :key="action.id"
          :selected.sync="actionFilterList[action.id]"
          :label="action.name"
          style="max-width: 150px"
          color="primary"
          text-color="white"
        >
          <q-tooltip>{{ action.name }}</q-tooltip>
        </q-chip>
      </div>
    </div>
  </template>
  <template v-slot:body="props">
    <q-tr :props="props" :class="{ 'bg-warning': props.row.end - props.row.start <= 0}">
      <q-td key="start" :props="props">
        <q-input
          v-model.number="props.row.start"
          dense
          borderless
          type="number"
          :debounce="1500"
          @mousewheel.prevent
        ></q-input>
      </q-td>
      <q-td key="end" :props="props">
        <q-input
          v-model.number="props.row.end"
          dense
          borderless
          type="number"
          :debounce="1500"
          @mousewheel.prevent
        ></q-input>
      </q-td>
      <q-td key="duration" :props="props">
        {{ toFixed2(props.row.end - props.row.start) }}
      </q-td>
      <q-td key="action" :props="props">
        <q-select
          v-model="props.row.action"
          :options="actionOptionList"
          dense
          options-dense
          borderless
          emit-value
          map-options
          @input="handleActionInput(props.row)"
        ></q-select>
      </q-td>
      <q-td key="object" :props="props">
        <q-select
          v-model="props.row.object"
          :options="objectOptionMap[props.row.action]"
          dense
          options-dense
          borderless
          emit-value
          map-options
        ></q-select>
      </q-td>
      <q-td key="color" :props="props">
        <q-chip
          dense
          outline
          :style="{ 'border-color': props.row.color, 'color': props.row.color }"
        >
          {{ props.row.color.toUpperCase() }}
         </q-chip>
        <q-popup-edit
          auto-save
          v-model="props.row.color"
          title="Edit the action color"
        >
          <q-color v-model="props.row.color"></q-color>
        </q-popup-edit>
      </q-td>
      <q-td key="description" :props="props">
        <q-input
          v-model="props.row.description"
          dense
          borderless
          type="text"
        ></q-input>
      </q-td>
      <q-td key="operation" :props="props">
        <q-btn-group spread flat>
          <q-btn
            flat
            dense
            icon="gps_fixed"
            style="width: 100%"
            @click="handleGoto(props.row)"
          ></q-btn>
          <q-btn
            flat
            dense
            icon="delete"
            color="negative"
            style="width: 100%"
            @click="handleDelete(props.row)"
          ></q-btn>
        </q-btn-group>
      </q-td>
    </q-tr>
  </template>
</q-table>
`

const columnList = [
  {
    name: 'start',
    align: 'center',
    label: 'start',
    field: 'start',
    sortable: true,
    sort: (a, b, rowA, rowB) => a !== b ? a - b : rowA.end - rowB.end,
    style: 'width: 100px',
  },
  {
    name: 'end',
    align: 'center',
    label: 'end',
    field: 'end',
    sortable: true,
    sort: (a, b, rowA, rowB) => a !== b ? a - b : rowA.start - rowB.start,
    style: 'width: 100px',
  },
  {
    name: 'duration',
    align: 'center',
    label: 'duration',
    style: 'width: 100px',
  },
  {
    name: 'action',
    align: 'center',
    label: 'action',
    field: 'action',
    style: 'width: 250px',
  },
  {
    name: 'object',
    align: 'center',
    label: 'object',
    field: 'object',
    style: 'width: 250px',
  },
  {
    name: 'color',
    align: 'center',
    label: 'color',
    field: 'color',
    style: 'width: 250px',
  },
  {
    name: 'description',
    align: 'center',
    label: 'description',
    field: 'description',
  },
  {
    name: 'operation',
    align: 'center',
    label: 'operation',
    field: 'operation',
    style: 'width: 200px',
  },
]

import utils from '../../../libs/utils.js'
import { ActionAnnotation } from '../../../libs/annotationlib.js'

export default {
  data: () => {
    return {
      columnList,
      pagination: { rowsPerPage: 0 },
      toFixed2: utils.toFixed2,
      actionFilterList: [],
      filter: false,
    }
  },
  methods: {
    ...Vuex.mapMutations([
      'setActionAnnotationList',
      'setLeftCurrentFrame',
      'setRightCurrentFrame',
    ]),
    handleAdd () {
      const actionAnnotation = new ActionAnnotation(
        utils.index2time(this.leftCurrentFrame),
        utils.index2time(this.rightCurrentFrame),
        this.actionOptionList[0] ? this.actionOptionList[0].value : null,
        this.actionOptionList[0] &&
        (this.actionOptionList[0].objects[0] || this.actionOptionList[0].objects[0] === 0)
          ? this.actionOptionList[0].objects[0]
          : null,
        this.actionOptionList[0] ? this.actionOptionList[0].color : null,
        '',
      )
      this.actionAnnotationList.push(actionAnnotation)
    },
    handleClearAll () {
      if (this.actionAnnotationList.length !== 0) {
        utils.confirm('Are you sure to delete ALL actions?').onOk(() => {
          this.actionAnnotationList = []
        })
      }
      else {
        utils.notify('There are no actions!')
      }
    },
    handleActionInput (row) {
      row.color = this.actionOptionList[row.action].color
      row.object = this.actionOptionList[row.action].objects[0] || this.actionOptionList[row.action].objects[0] === 0
        ? this.actionOptionList[row.action].objects[0]
        : null
    },
    handleGoto (row) {
      if (typeof (row.start) === 'number') {
        this.setLeftCurrentFrame(utils.time2index(row.start))
      }
      if (typeof (row.end) === 'number') {
        this.setRightCurrentFrame(utils.time2index(row.end))
      }
    },
    handleDelete (row) {
      utils.confirm('Are you sure to delete this action?').onOk(() => {
        for (let i in this.actionAnnotationList) {
          if (this.actionAnnotationList[i] === row) {
            this.actionAnnotationList.splice(i, 1)
          }
        }
      })
    },
    handleKeyup (event) {
      if (event.target.nodeName.toLowerCase() === 'input') {
        return false
      }
      if (event.code === 'Equal') {
        this.handleAdd()
      }
    },
    handleSelectAll () {
      for (const action of this.actionLabelData) {
        Vue.set(this.actionFilterList, action.id, true)
      }
    },
    handleClearSelectedAll () {
      for (const action of this.actionLabelData) {
        Vue.set(this.actionFilterList, action.id, false)
      }
      Vue.set(this.actionFilterList, 0, true)
    },
    actionFilter (rows, filter) {
      const ret = []
      for (const row of rows) {
        if (this.actionFilterList[row.action]) {
          ret.push(row)
        }
      }
      return ret
    },
  },
  computed: {
    video () {
      return this.$store.state.video
    },
    actionAnnotationList: {
      get () {
        return this.$store.state.annotation.actionAnnotationList
      },
      set (value) {
        this.setActionAnnotationList(value)
      },
    },
    leftCurrentFrame () {
      return this.$store.state.annotation.leftCurrentFrame
    },
    rightCurrentFrame () {
      return this.$store.state.annotation.rightCurrentFrame
    },
    actionLabelData () {
      return this.$store.state.settings.actionLabelData
    },
    objectLabelData () {
      return this.$store.state.settings.objectLabelData
    },
    actionOptionList () {
      const actionLabelData = this.actionLabelData
      let actionOptionList = []
      for (let actionLabel of actionLabelData) {
        actionOptionList.push({
          label: actionLabel.name,
          value: actionLabel.id,
          color: actionLabel.color,
          objects: actionLabel.objects,
        })
      }
      return actionOptionList
    },
    objectOptionMap () {
      const ret = {}
      for (let action of this.actionLabelData) {
        ret[action.id] = []
        for (let object of this.objectLabelData) {
          if (action.objects.indexOf(object.id) !== -1) {
            ret[action.id].push({
              label: object.name,
              value: object.id,
            })
          }
        }
      }
      return ret
    },
  },
  created () {
    for (const action of this.actionLabelData) {
      this.actionFilterList[action.id] = true
    }
  },
  mounted () {
    window.addEventListener('keyup', this.handleKeyup)
  },
  destroyed () {
    window.removeEventListener('keyup', this.handleKeyup)
  },
  template: ACTION_TABLE_TEMPLATE,
}
