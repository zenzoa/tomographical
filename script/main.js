let { h, render, Component } = preact

window.onload = () => {
    render(
        h(Main),
        document.getElementById('main')
    )
}

class Main extends Component {
    constructor() {
        super()

        this.minSize = 20
        this.maxSize = 40

        this.state = {
            nextWidth: 15,
            nextHeight: 15,
            size: this.maxSize,
            density: 0.6,
            solved: false
        }

        this.setupBoard = () => {
            let width = this.state.nextWidth
            let height = this.state.nextHeight

            let boardState = Array(width).fill(0).map(() => Array(height).fill(0))
            let boardSolution = Array(width).fill(0).map(() => Array(height).fill(null))

            let numCells = width * height
            let toBeFilled = Math.floor(numCells * this.state.density)
            if (toBeFilled > numCells) toBeFilled = numCells

            let x, y
            while (toBeFilled) {
                x = Math.floor(Math.random() * width)
                y = Math.floor(Math.random() * height)
                if (boardSolution[y][x] == null) {
                    boardSolution[y][x] = 1
                    toBeFilled--
                }
            }

            boardSolution = boardSolution.map(row => row.map(cell => cell || 2))

            let verticalHints = this.verticalHints(boardSolution)
            let horizontalHints = this.horizontalHints(boardSolution)

            this.setState({ width, height, boardState, boardSolution, verticalHints, horizontalHints, solved: false })
            this.resize(horizontalHints)
        }

        this.resetBoard = () => {
            let width = this.state.width
            let height = this.state.height
            let boardState = Array(width).fill(0).map(() => Array(height).fill(0))
            this.setState({ boardState, solved: false })
        }

        this.updateBoard = (x, y, value) => {
            if (this.state.solved) return

            let boardState = this.state.boardState
            boardState[y][x] = value
            this.setState({ boardState })

            if (this.testSolution()) {
                this.solve()
            }
        }

        this.testSolution = () => {
            for (let y = 0; y < this.state.height; y++) {
                for (let x = 0; x < this.state.width; x++) {
                    let value = this.state.boardState[y][x]
                    let solution = this.state.boardSolution[y][x]
                    if (solution === 1 && value !== 1) return false
                    if (solution !== 1 && value === 1) return false
                }
            }
            return true
        }

        this.solve = () => {
            this.setState({ boardState: this.state.boardSolution, solved: true })
        }

        this.changeDimensions = (e) => {
            let value = parseInt(e.target.value)
            if (isNaN(value)) return
            this.setState({ nextWidth: value, nextHeight: value })
        }

        this.parseRow = (row) => {
            let rowString = row.join('')
            let simpleString = rowString.replace(/[02]+/g, '0').replace(/^0+/g, '').replace(/0+$/g, '')
            let runs = simpleString.split('0')
            let runCounts = runs.map(run => run.length)
            runCounts = runCounts.filter(runCount => runCount > 0)
            return runCounts
        }

        this.horizontalHints = (boardState) => {
            return boardState.map(row => this.parseRow(row))
        }

        this.verticalHints = (boardState) => {
            let width = boardState[0].length
            let hints = []
            for (let x = 0; x < width; x++) {
                let column = boardState.map(row => row[x])
                let parsedColumn = this.parseRow(column)
                hints.push(parsedColumn)
            }
            return hints
        }

        // TODO: handle landscape style
        this.resize = (horizontalHints) => {
            let hints = this.state.horizontalHints || horizontalHints
            let width = window.innerWidth
            let maxHints = hints.reduce((prev, curr) => curr.length > prev ? curr.length : prev, 0)
            let tiles = (maxHints * 0.67) + this.state.width
            let tileSize = Math.floor(width / (tiles + 1))
            let size = Math.min(this.maxSize, Math.max(this.minSize, tileSize))
            let boardWidth = tiles * size
            this.setState({ size, boardWidth })
        }
    }

    componentDidMount() {
        window.onresize = this.resize
        this.setupBoard()
    }

    render(_, { width, height, size, boardState, boardWidth, verticalHints, horizontalHints, solved }) {
        let updateBoard = this.updateBoard

        let title = h('h1', { style: { maxWidth: boardWidth } }, ['tomographical'])

        let sizeSelect = h('select', { onchange: this.changeDimensions }, [
            h('option', { value: 5, selected: width === 5 }, '5x5'),
            h('option', { value: 10, selected: width === 10 }, '10x10'),
            h('option', { value: 15, selected: width === 15 }, '15x15'),
            h('option', { value: 20, selected: width === 20 }, '20x20'),
            h('option', { value: 25, selected: width === 25 }, '25x25')
        ])
        let newButton = h('button', { type: 'button', onclick: this.setupBoard }, 'new')
        let resetButton = h('button', { type: 'button', onclick: this.resetBoard }, 'reset')
        let solveButton = h('button', { type: 'button', onclick: this.solve }, 'solve')
        let controls = h('div', { class: 'button-row', style: { maxWidth: boardWidth } },
            [sizeSelect, newButton, resetButton, solveButton]
        )

        let board = boardState && h('div', { class: 'board-container', style: { width: boardWidth } },
            h(Board, { width, height, size, boardState, updateBoard, verticalHints, horizontalHints })
        )

        return h('div', { class: solved && 'solved' },
            [board, title, controls]
        )
    }
}

class Board extends Component {
    constructor() {
        super()

        this.startX = null
        this.startY = null
        this.endX = null
        this.endY = null

        this.startDrawing = (e, x, y) => {
            e.preventDefault()
            this.startX = x
            this.startY = y
        }

        // TODO: show in-progress drawing
        this.moveDrawing = (e, x, y) => {
            this.endX = x
            this.endY = y
        }

        this.endDrawing = (e, x, y) => {
            e.preventDefault()
            let value = this.props.boardState[this.startY][this.startX]
            let nextValue = value + 1
            if (nextValue > 2) nextValue = 0

            if (x === this.startX && y === this.startY) {
                this.props.updateBoard(x, y, nextValue)
            } else if (x === this.startX) {
                let minY = Math.min(y, this.startY)
                let maxY = Math.max(y, this.startY)
                for (let i = minY; i <= maxY; i++) {
                    this.props.updateBoard(x, i, nextValue)
                }
            } else if (y === this.startY) {
                let minX = Math.min(x, this.startX)
                let maxX = Math.max(x, this.startX)
                for (let i = minX; i <= maxX; i++) {
                    this.props.updateBoard(i, y, nextValue)
                }
            }

            this.startX = null
            this.startY = null
            this.endX = null
            this.endY = null
        }

        this.draw = (e) => {
            let realEvent = event.touches ? event.touches[0] : event
        }
    }

    render({ width, height, size, boardState, verticalHints, horizontalHints }) {
        let cell = (x, y) => {
            let value = boardState[y][x]
            return h('div', {
                class: 'cell cell-' + value,
                ontouchstart: (e) => this.startDrawing(e, x, y),
                onmousedown: (e) => this.startDrawing(e, x, y),
                ontouchend: (e) => this.endDrawing(e, x, y),
                onmouseup: (e) => this.endDrawing(e, x, y),
                ontouchmove: (e) => this.moveDrawing(e, x, y),
                onmousemove: (e) => this.moveDrawing(e, x, y)
            })
        }

        return h('table', { class: 'board' }, [
            h('tr', null, [
                h('td'),
                h('td', null, h(Hints, { size, isVertical: true, hints: verticalHints }))
            ]),
            h('tr', null, [
                h('td', null, h(Hints, { size, isVertical: false, hints: horizontalHints })),
                h('td', null, h(Grid, { width, height, size, cell }))
            ])
        ])
    }
}

class Hints extends Component {
    render({ size, isVertical, hints }) {
        let contents

        let innerSize = Math.floor(Math.max(12, size * 0.67))

        if (isVertical) {
            contents = h('tr', null, hints.map(hintGroup =>
                h('td', { style: { width: size + 'px' } }, hintGroup.map(hint =>
                    h('div', { class: 'hint', style: { height: innerSize + 'px' } }, hint)
                ))
            ))
            hints.map(hintGroup => {
                return h('tr', null, )
            })
        } else {
            contents = hints.map(hintGroup =>
                h('tr', null, h('td', { style: { height: size + 'px' } }, hintGroup.map(hint =>
                    h('div', { class: 'hint', style: { width: innerSize + 'px' } }, hint)
                )))
            )
        }

        return h('div', { class: 'hints-container' },
            h('table', {
                class: 'hints ' + (isVertical ? 'hints-vertical' : 'hints-horizontal')
            }, contents)
        )
    }
}

class Grid extends Component {
    constructor() {
        super()

        let color1 = chroma.random()
        let color2 = chroma.random()
        let color3 = chroma.random()
        let angle = Math.floor(Math.random() * 360) + 'deg'
        this.gradient = `linear-gradient(${angle}, ${color1} 0%, ${color2} 50%, ${color3} 100%)`
    }

    render({ width, height, size, cell }) {
        let style = {
            width: size + 'px',
            height: size + 'px'
        }

        let rows = Array(height).fill(0).map((_, y) => {
            return h('tr', null, Array(width).fill(0).map((_, x) => {
                return h('td', { style }, cell && cell(x, y))
            }))
        })

        return h('div', { class: 'grid-container', style: { background: this.gradient } },
            h('table', { class: 'grid' }, rows)
        )
    }
}