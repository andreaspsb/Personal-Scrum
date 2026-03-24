import { useState } from 'react'
// @ts-ignore
import Joyride, { Step, STATUS } from 'react-joyride'
import { HelpCircle } from 'lucide-react'

export default function AppTutorial() {
  const [run, setRun] = useState(false)

  // Tutorial Steps explaining the UI and Scrum concepts
  const steps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      content: (
        <div>
          <h2>Bem-vindo ao Personal Scrum!</h2>
          <p>Este tutorial rápido vai te explicar como usar a ferramenta e alguns conceitos básicos da metodologia ágil.</p>
        </div>
      ),
    },
    {
      target: '[data-tour="projects-menu"]',
      content: (
        <div>
          <h3>Projetos</h3>
          <p>Aqui você cria e acessiona seus projetos. Em um contexto <strong>Scrum</strong>, um projeto é o "guarda-chuva" onde você desenvolve seus produtos.</p>
        </div>
      ),
    },
    {
      target: '[data-tour="dashboard-active-sprints"]',
      content: (
        <div>
          <h3>Active Sprints</h3>
          <p>Uma <strong>Sprint</strong> é um ciclo de tempo (geralmente 1 a 4 semanas) focado em entregar um incremento útil de valor. Aqui você confere as Sprints ativas no momento.</p>
        </div>
      ),
    },
    {
      target: '[data-tour="project-backlog"]',
      content: (
        <div>
          <h3>Projeto: O Backlog</h3>
          <p>O <strong>Backlog</strong> (Product Backlog) é a lista ordenada de tudo que é necessário no produto, incluindo funcionalidades e correções.</p>
          <p>Nele você cria suas <strong>User Stories</strong> (Histórias de Usuário), que representam funcionalidades na visão do usuário final.</p>
        </div>
      ),
    },
    {
      target: '[data-tour="sprint-board"]',
      content: (
        <div>
          <h3>Scrum Board</h3>
          <p>O <strong>Scrum Board</strong> (Quadro) é onde você clica e arrasta suas <strong>User Stories</strong> durante a <strong>Sprint</strong> ativa. O objetivo é levar todas elas até a coluna DONE!</p>
        </div>
      ),
    }
  ]

  const handleJoyrideCallback = (data: any) => {
    const { status } = data
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setRun(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'var(--primary)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          zIndex: 999
        }}
        title="Iniciar Tutorial (Scrum Coach)"
      >
        <HelpCircle size={24} />
      </button>

      <Joyride
        steps={steps}
        run={run}
        continuous
        showSkipButton
        showProgress
        callback={handleJoyrideCallback}
        locale={{
          back: 'Voltar',
          close: 'Fechar',
          last: 'Finalizar',
          next: 'Próximo',
          skip: 'Pular Tour'
        }}
        styles={{
          options: {
            primaryColor: '#6366f1',
            zIndex: 1000,
          }
        }}
      />
    </>
  )
}
