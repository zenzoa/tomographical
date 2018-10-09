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

            let colHints = this.colHints(boardSolution)
            let rowHints = this.rowHints(boardSolution)

            let completedColHints = null
            let completedRowHints = null

            let gradient = this.gradient()

            this.setState({ width, height, boardState, boardSolution, colHints, rowHints, gradient, completedColHints, completedRowHints, solved: false })
            this.resize(colHints, rowHints)
        }

        this.resetBoard = () => {
            let width = this.state.width
            let height = this.state.height
            let boardState = Array(width).fill(0).map(() => Array(height).fill(0))
            let completedColHints = null
            let completedRowHints = null
            this.setState({ boardState, completedColHints, completedRowHints, solved: false })
        }

        this.updateBoard = (x, y, value) => {
            if (this.state.solved) return

            let boardState = this.state.boardState
            boardState[y][x] = value

            let colHints = this.colHints(this.state.boardSolution)
            let rowHints = this.rowHints(this.state.boardSolution)

            let colSequences = this.colSequences(boardState)
            let rowSequences = this.rowSequences(boardState)

            let completedColHints = this.completedHints(colHints, colSequences)
            let completedRowHints = this.completedHints(rowHints, rowSequences)

            this.setState({ boardState, colHints, rowHints, completedColHints, completedRowHints })

            if (this.testSolution(boardState)) {
                this.solve(boardState)
            }
        }

        this.compareHints = (hints, solutionHints) => {
            let ok = true

            hints.forEach((hintGroup, i) => {
                let solutionHintGroup = solutionHints[i]
                if (hintGroup.length !== solutionHintGroup.length) {
                    ok = false
                } else {
                    hintGroup.forEach((hint, j) => {
                        let solutionHint = solutionHintGroup[j]
                        if (hint !== solutionHint) {
                            ok = false
                        }
                    })
                }
            })

            return ok
        }

        this.testSolution = (boardState) => {
            boardState = boardState || this.state.boardState

            let colHints = this.colHints(boardState)
            let rowHints = this.rowHints(boardState)

            let colOk = this.compareHints(colHints, this.state.colHints)
            let rowOk = this.compareHints(rowHints, this.state.rowHints)

            return colOk && rowOk
        }

        this.solve = (boardState) => {
            boardState = boardState.map(row => row.map(cell => cell === 0 ? 2 : cell))

            this.setState({ boardState, solved: true })
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
            let runCounts = runs.map(r => r.length)
            runCounts = runCounts.filter(c => c > 0)
            return runCounts
        }

        this.rowHints = (boardState) => {
            return boardState.map(row => this.parseRow(row))
        }

        this.colHints = (boardState) => {
            let width = boardState[0].length
            let hints = []
            for (let x = 0; x < width; x++) {
                let column = boardState.map(row => row[x])
                hints.push(this.parseRow(column))
            }
            return hints
        }
        
        this.completedHints = (hints, sequences) => {
            let completedHints = sequences.map((sequenceGroup, i) => {
                let completedHintsInRow = []
                let hintString = hints[i].join('-')
                sequenceGroup.forEach(sequence => {
                    let seqString = sequence.join('-')
                    let firstIndex = hintString.indexOf(seqString)
                    let lastIndex = hintString.lastIndexOf(seqString)
                    if (firstIndex >= 0 && firstIndex === lastIndex) {
                        let partialString = hintString.slice(0, firstIndex)
                        let partialArray = partialString.split('-')
                        let hintIndex = partialArray.length - 1
                        for (let i = 0; i < sequence.length; i++) {
                            completedHintsInRow.push(hintIndex + i)
                        }
                    }
                })
                return completedHintsInRow
            })
            return completedHints
        }

        this.parseSequences = (row) => {
            let rowString = '2' + row.join('') + '2'
            let matches = rowString.match(/2[12]+2/g)
            let sequences = matches && matches.map(match =>
                match.split('2').map(s => s.length).filter(s => s > 0)
            )
            return sequences || []
        }

        this.rowSequences = (boardState) => {
            return boardState.map(row => this.parseSequences(row))
        }

        this.colSequences = (boardState) => {
            let width = boardState[0].length
            let sequences = []
            for (let x = 0; x < width; x++) {
                let column = boardState.map(row => row[x])
                sequences.push(this.parseSequences(column))
            }
            return sequences
        }

        this.resize = (colHints, rowHints) => {
            colHints = this.state.colHints || colHints
            rowHints = this.state.rowHints || rowHints

            let maxColHints = colHints.reduce((prev, curr) => curr.length > prev ? curr.length : prev, 0)
            let maxHoriztonalHints = rowHints.reduce((prev, curr) => curr.length > prev ? curr.length : prev, 0)

            let colTiles = (maxColHints * 0.67) + this.state.height
            let rowTiles = (maxHoriztonalHints * 0.67) + this.state.width

            let tileWidth = Math.floor(window.innerWidth / (rowTiles + 1))
            let tileHeight = Math.floor((window.innerHeight - 120) / (colTiles + 1))
            let tileSize = Math.min(tileWidth, tileHeight)

            let size = Math.min(this.maxSize, Math.max(this.minSize, tileSize))
            let boardWidth = rowTiles * size

            this.setState({ size, boardWidth })
        }

        this.gradient = () => {
            let color1 = chroma.random()
            let color2 = chroma.random()
            let color3 = chroma.random()
            let angle = Math.floor(Math.random() * 360) + 'deg'
            return `linear-gradient(${angle}, ${color1} 0%, ${color2} 50%, ${color3} 100%)`
        }
    }

    componentDidMount() {
        window.onresize = this.resize
        this.setupBoard()
    }

    render(_, { width, height, size, boardState, boardSolution, boardWidth, colHints, rowHints, completedColHints, completedRowHints, gradient, solved }) {
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
        let solveButton = h('button', { type: 'button', onclick: () => this.solve(boardSolution) }, 'solve')
        let controls = h('div', { class: 'button-row', style: { maxWidth: boardWidth } },
            [sizeSelect, newButton, resetButton, solveButton]
        )

        let board = boardState && h('div', { class: 'board-container', style: { width: boardWidth } },
            h(Board, { width, height, size, boardState, updateBoard, colHints, rowHints, completedColHints, completedRowHints, gradient })
        )

        return h('div', { class: solved && 'solved' },
            [board, title, controls]
        )
    }
}

class Board extends Component {
    constructor() {
        super()

        this.state = {
            tempValue: 0,
            tempCells: []
        }

        this.startX = null
        this.startY = null
        this.endX = null
        this.endY = null

        this.startDrawing = (e, x, y) => {
            e.preventDefault()
            this.startX = x
            this.startY = y
        }

        this.moveDrawing = (e, x, y) => {
            if (this.startX == null || this.startY == null) return

            this.endX = x
            this.endY = y

            let tempCells = []
            if (x === this.startX && y === this.startY) {
                tempCells = [[this.startX, this.startY]]
            } else if (x === this.startX) {
                let minY = Math.min(y, this.startY)
                let maxY = Math.max(y, this.startY)
                for (let i = minY; i <= maxY; i++) {
                    tempCells.push([x, i])
                }
            } else if (y === this.startY) {
                let minX = Math.min(x, this.startX)
                let maxX = Math.max(x, this.startX)
                for (let i = minX; i <= maxX; i++) {
                    tempCells.push([i, y])
                }
            }
            this.setState({ tempCells })
        }

        this.endDrawing = (e, x, y) => {
            e.preventDefault()
            if (this.startX == null || this.startY == null) return

            let nextValue = 1 + this.props.boardState[this.startY][this.startX]
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

            this.resetDraw()
        }

        this.moveOutsideGrid = (e) => {
            e.preventDefault()
            if (this.startX == null || this.startY == null) return

            let x = e.clientX
            let y = e.clientY
            let gridEl = document.getElementById('grid')
            let grid = gridEl.getBoundingClientRect()
            if (!(x >= grid.left && x <= grid.right && y >= grid.top && y <= grid.bottom)) {
                this.resetDraw()
            }
        }

        this.resetDraw = () => {
            this.startX = null
            this.startY = null
            this.endX = null
            this.endY = null
            this.setState({ tempCells: [] })
        }

        this.draw = (e) => {
            let realEvent = event.touches ? event.touches[0] : event
        }
    }

    componentDidMount() {
        document.addEventListener('mousemove', this.moveOutsideGrid)
    }

    componentWillUnmount() {
        document.removeEventListener('mousemove', this.moveOutsideGrid)
    }

    render({ width, height, size, boardState, colHints, rowHints, completedColHints, completedRowHints, gradient }, { tempCells }) {
        let cell = (x, y, isTemp) => {
            let value = boardState[y][x]
            return h('div', {
                class: 'cell cell-' + value + (isTemp ? ' cell-temp' : ''),
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
                h('td', null, h(Hints, { size, isCol: true, hints: colHints, completedHints: completedColHints, boardState }))
            ]),
            h('tr', null, [
                h('td', null, h(Hints, { size, isCol: false, hints: rowHints, completedHints: completedRowHints, boardState })),
                h('td', null, h(Grid, { width, height, size, cell, gradient, tempCells }))
            ])
        ])
    }
}

class Hints extends Component {
    render({ size, isCol, hints, completedHints }) {
        let contents
        let innerSize = Math.floor(Math.max(12, size * 0.67))

        if (isCol) {
            contents = h('tr', null, hints.map((hintGroup, i) => {
                let completedHintsInRow = completedHints && completedHints[i]
                return h('td', { style: { width: size + 'px' } }, hintGroup.map((hint, j) => {
                    let hintCompleted = completedHintsInRow && completedHintsInRow.includes(j)
                    return h('div', {
                        class: 'hint ' + (hintCompleted && 'hint-completed'),
                        style: { height: innerSize + 'px' }
                    }, hint)
                }))
            }))
            hints.map(hintGroup => {
                return h('tr', null, )
            })
        } else {
            contents = hints.map((hintGroup, i) => {
                let completedHintsInRow = completedHints && completedHints[i]
                return h('tr', null, h('td', { style: { height: size + 'px' } }, hintGroup.map((hint, j) => {
                    let hintCompleted = completedHintsInRow && completedHintsInRow.includes(j)
                    return h('div', {
                        class: 'hint ' + (hintCompleted && 'hint-completed'),
                        style: { width: innerSize + 'px' }
                    }, hint)
                })))
            })
        }

        return h('div', { class: 'hints-container' },
            h('table', {
                class: 'hints ' + (isCol ? 'hints-col' : 'hints-row')
            }, contents)
        )
    }
}

class Grid extends Component {
    render({ width, height, size, cell, gradient, tempValue, tempCells }) {
        let style = {
            width: size + 'px',
            height: size + 'px'
        }

        let rows = Array(height).fill(0).map((_, y) => {
            return h('tr', null, Array(width).fill(0).map((_, x) => {
                let isTemp = false
                tempCells && tempCells.forEach(tempCell => {
                    if (tempCell[0] === x && tempCell[1] === y) isTemp = true
                })
                return h('td', { style }, cell && cell(x, y, isTemp))
            }))
        })

        return h('div', { class: 'grid-container', id: 'grid', style: { background: gradient } }, [
            h('table', { class: 'grid' }, rows)
        ])
    }
}
