# Pixel Agents MVP — UML 文档

## 1. 类图 (Class Diagram)

```mermaid
classDiagram
    class TileType {
      <<enumeration>>
      Floor = 0
      Wall = 1
      Desk = 2
      Plant = 3
      Couch = 4
      Whiteboard = 5
      Bookshelf = 6
      Printer = 7
      Coffee = 8
    }

    class AgentState {
      <<enumeration>>
      Idle
      Walking
      Typing
      Reading
      Waiting
      Error
    }

    class AgentRole {
      <<enumeration>>
      Coder
      Reviewer
      Designer
      Writer
      Tester
    }

    class TileMap {
      +number w
      +number h
      +TileType[][] tiles
      +generate() void
      +set(x, y, type) void
      +walkable(x, y) boolean
    }

    class Agent {
      +number id
      +string name
      +AgentRole role
      +number deskX
      +number deskY
      +number x
      +number y
      +AgentState state
      +PathNode[] path
      +number pathIdx
      +number animFrame
      +number animTimer
      +number moveTimer
      +number stateTimer
      +string speech
      +number speechTimer
      +string facing
      +number bob
      +update(dt, map) void
      +walkTo(tx, ty, map) void
      +setState(state) void
    }

    class PathNode {
      <<interface>>
      +number x
      +number y
    }

    class findPath {
      <<function>>
      +findPath(map, sx, sy, ex, ey) PathNode[]
    }

    class Renderer {
      +HTMLCanvasElement canvas
      +CanvasRenderingContext2D ctx
      +TileMap map
      +number ts
      +resize() void
      +render(agents[], time) void
      -drawDesk(x, y, ts) void
      -drawPlant(x, y, ts, time) void
      -drawCouch(x, y, ts) void
      -drawWhiteboard(x, y, ts) void
      -drawBookshelf(x, y, ts) void
      -drawPrinter(x, y, ts, time) void
      -drawCoffee(x, y, ts, time) void
      -drawAgent(agent, ts) void
    }

    class Game {
      +TileMap map
      +Renderer renderer
      +Agent[] agents
      +number nextIdx
      +number simTimer
      +boolean running
      +start() void
      +loop() void
      +update(dt) void
      +simulate() void
      +addAgent() void
      +reset() void
      +updateStatusBar() void
      +setupInteraction() void
    }

    TileMap "1" *-- "*" TileType
    Game "1" --> "1" TileMap
    Game "1" --> "1" Renderer
    Game "1" o-- "*" Agent
    Agent "1" --> "1" AgentState
    Agent "1" --> "1" AgentRole
    Agent "1" ..> PathNode : uses
    Agent ..> findPath : calls
    Renderer "1" --> "1" TileMap
    Renderer ..> Agent : renders
```

## 2. Agent 状态机 (State Machine)

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> Typing: simulate() / random
    Idle --> Reading: simulate() / random
    Idle --> Waiting: simulate() / random
    Idle --> Error: simulate() / random
    Idle --> Walking: walkTo()

    Walking --> Typing: path reached
    Walking --> Idle: user click

    Typing --> Idle: stateTimer > 3-8s
    Typing --> Reading: user click
    Typing --> Waiting: user click
    Typing --> Error: simulate()

    Reading --> Typing: stateTimer > 2-6s
    Reading --> Idle: user click
    Reading --> Waiting: user click

    Waiting --> Typing: stateTimer > 3s
    Waiting --> Idle: user click

    Error --> Idle: stateTimer > 4s
    Error --> Idle: user click

    note right of Typing
      Typing animation (4 frames)
      Arm movement synced to frame
    end note

    note right of Walking
      BFS pathfinding
      Step animation (4 frames)
      Facing direction updates
    end note

    note right of Reading
      Glasses overlay
      Slow blink animation
    end note

    note right of Waiting
      Speech bubble appears
      "?" mark above head
    end note

    note right of Error
      "!" mark above head
      Red shake animation
    end note
```

## 3. 组件图 (Component Diagram)

```mermaid
graph TB
    subgraph "Browser"
        subgraph "index.html"
            subgraph "UI Layer"
                Header["Header Bar<br/>(title + buttons)"]
                Canvas["Canvas<br/>(game rendering)"]
                StatusBar["Status Bar<br/>(agent indicators)"]
                Tooltip["Tooltip<br/>(hover info)"]
            end

            subgraph "Game Engine"
                Game["Game<br/>(main loop)"]
                TileMap["TileMap<br/>(office layout)"]
                Agent["Agent[]<br/>(characters)"]
                Renderer["Renderer<br/>(canvas drawing)"]
                BFS["BFS<br/>(pathfinding)"]
            end

            Header -->|"click add/reset"| Game
            Canvas -->|"click/hover/resize"| Game
            Game -->|"start"| TileMap
            Game -->|"create"| Agent
            Game -->|"render call"| Renderer
            Game -->|"simulation"| Agent
            Renderer -->|"read layout"| TileMap
            Renderer -->|"draw agents"| Agent
            Agent -->|"path find"| BFS
            Agent -->|"update state"| Agent
            Game -->|"update"| StatusBar
            Game -->|"update"| Tooltip
        end
    end

    subgraph "Simulation Loop"
        Sim["requestAnimationFrame<br/>(60fps)"]
        Sim -->|"dt"| Game
        Game -->|"update agents"| Agent
        Agent -->|"2s interval"| Sim
    end
```

## 4. 渲染流程 (Render Pipeline)

```mermaid
flowchart LR
    A["Game.loop()"] -->|"60fps"| B["update(dt)"]
    B --> C["agent.update()"]
    C -->|"BFS pathfinding"| D["findPath()"]
    B --> E["simulate()"]
    E -->|"random state change"| F["agent.setState()"]
    A --> G["renderer.render()"]
    G --> H["draw tiles<br/>(floor → walls → furniture)"]
    H --> I["sort agents by Y"]
    I --> J["drawAgent()<br/>(shadow → body → head → activity)"]
    J --> K["drawSpeechBubble()"]
    A --> L["updateStatusBar()"]
```

## 5. 数据结构 (Data Structures)

```mermaid
erDiagram
    TILE_MAP {
        int width
        int height
        TileType[][] tiles
    }

    AGENT {
        int id
        string name
        AgentRole role
        float x
        float y
        int deskX
        int deskY
        AgentState state
        float animTimer
        string speech
    }

    PATH_NODE {
        int x
        int y
    }

    FURNITURE {
        TileType type
        string color
        bool walkable
    }

    TILE_MAP ||--o{ FURNITURE : contains
    AGENT ||--o| PATH_NODE : has_current_path
    AGENT }o--o| TILE_MAP : positioned_in
```

## 6. 交互序列图 (Interaction - Click Agent)

```mermaid
sequenceDiagram
    participant User
    participant Canvas
    participant Game
    participant Agent
    participant Renderer
    participant StatusBar

    User->>Canvas: Click on agent position
    Canvas->>Game: mousemove + click events
    Game->>Game: Calculate tile coords
    Game->>Game: Find matching agent
    Game->>Agent: setState(next state)
    Agent->>Agent: Reset stateTimer
    Game->>StatusBar: updateStatusBar()
    StatusBar->>User: Update status indicator
    Game->>Renderer: render(agents, time)
    Renderer->>Canvas: Draw updated agent animation
    Canvas->>User: See new agent state
```
